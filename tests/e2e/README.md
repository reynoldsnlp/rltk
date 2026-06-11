# E2E Tests — Strategy, Conventions & Flakiness Notes

A living document for the Playwright e2e suite. The goal is to **unify how tests
set up and wait**, and to record what's been tried so we don't re-litigate dead
ends. Update it whenever you change a shared strategy, fix a class of flake, or
rule something out.

> **How to use this file:** before adding/altering a test or chasing a flake,
> skim "Core principles" and "Deterministic signals". When you try a strategy,
> add a dated entry under "Attempt log" (✅ worked / ❌ failed / 🔬 untried) with
> the *reason*, not just the outcome.

---

## How to run

- From the repo root: `npm test` (runs `scripts/run-playwright.sh`).
- Parallelism is governed by `playwright.config.js`, **not** by the script:
  - **Local:** `workers: 4`, `retries: 0` (fail fast / surface flakes).
  - **CI:** `workers: 1`, `retries: 2` (memory-safe on the single runner).
  - Global `timeout: 60000`.
- `"$@"` passes through, so you can override locally, e.g.
  `npm run test -- --workers=2` or `npm run test -- reading-tutor-stress.spec.js`.

---

## Environment & constraints (the hard facts)

These shape every decision below:

- **Headed Chromium only.** Chrome extensions do **not** load in headless mode, so
  every test launches a headed persistent context.
- **Each Playwright worker runs its own persistent Chrome context** (worker-scoped
  `browserContext`/`extensionId`/`serviceWorker` fixtures in `fixtures.js`) that
  loads **~570 MB of HFST/CG3 WASM models** in an offscreen document. The suite is
  therefore **memory-bound, not CPU-bound.**
- **Analysis is genuinely slow on CI.** The single GitHub runner analyzes far
  slower than a dev machine; the 30 s Playwright default is too tight.
- **Long single-worker runs degrade the shared context.** After dozens of tests in
  one worker, a heavy late test can stall or crash
  (`Target page, context or browser has been closed`). More workers = shorter-lived
  contexts = less degradation (but more memory).
- **`fullyParallel: true`**; parallelism is governed by `playwright.config.js`
  (see "How to run").
- **`scripts/run-playwright.sh` no longer hardcodes `--workers`/`--retries`** — the
  config governs.

---

## Core principles (rules for writing tests)

1. **Wait on one canonical "settled" signal, never bare "spans exist."**
   `.ʁ-*` spans stream in *during* analysis, so `querySelectorAll('.ʁ-…').length > 0`
   is true mid-stream and anything after it races. Use the right settle helper:
   - Reading **tutor** tab → `waitForReadingTutorSettled(page, sidePanelPage)`
   - Reading **activities** → `waitForActivitySettled(page, sidePanelPage, { spanSelector })`
2. **Never `page.waitForTimeout(N)`.** Replace every fixed sleep with a wait on a
   DOM/attribute/event signal. (For "verify X does *not* happen" assertions, anchor
   on a deterministic precondition instead of sleeping — see the *"changes detected
   highlights refresh button with tooltip, manual click re-analyzes"* test in
   `reading-tutor-refresh.spec.js`.)
3. **Wait for actionability before acting; wait for settled before asserting a
   resting state.** (The *"non-cyrillic or analyzed changes do not trigger auto
   refresh"* lesson in `reading-tutor-refresh.spec.js` — don't assert the final
   button/dirty state while processing is still running.)
4. **Make transient-state tests deterministic — don't race analysis speed.** Use the
   `injectSlowEnhance` hook + data-attribute anchors (`data-rltkBatch*`, `data-dirty`),
   not real timing. (The *"pause shows resume during analysis"* lesson in
   `reading-tutor-refresh.spec.js`.)
5. **Poll atomically.** When polling for a condition then asserting on related
   mutable state, capture the snapshot *inside* the poll; don't `expect.poll(...)`
   then separately re-read state that can change between. (The `batch-processing`
   lesson.)
6. **Don't over-apply settle waits.** If a test only needs the *first* element
   (e.g. roots-MC asserts only the first container), wait on that element directly.
   Forcing full-enhancement settle on a heavy activity is needlessly slow and can
   tip a degraded context over the timeout. (The roots-MC lesson.)
7. **Dedupe setup through the shared helpers** so a fix lands once, not in N
   divergent copies.

---

## Setup conventions

- **Let the side panel drive injection.** Opening the side panel or clicking Enhance
  triggers the extension's background injection — never call
  `chrome.scripting.executeScript` (or custom injection loops) from a test.
- **Isolate each test.** Clear `chrome.storage.local` and close leftover pages in
  `beforeEach`/`afterEach`; the worker-scoped context is reused across tests.
- **Target the fixture tab explicitly** with the `debugTabId` query param when opening
  the side panel (the `openSidePanel` helper does this for you).
- **Keep fixtures small and fast** — prefer minimal HTML pages in
  `docs/tests/fixtures/`, served by `tests/e2e/server.js`.

---

## Shared helpers (`test-helpers.js`)

Prefer these over inline setup:

| Helper | Use for |
|---|---|
| `openFixture(page, browserContext, testInfo, fixtureName)` | `goto` + resolve the tab id → `{ fixtureUrl, tabId }` |
| `openSidePanel(browserContext, extensionId, tabId, opts)` | open the side panel + `waitForSidePanelReady`; `opts.waitForReadingTutor: false` to skip the RT-ready wait |
| `waitForReadingTutorSettled(page, sidePanelPage)` | reading-tutor "safe to interact": spans **and** `#reading-tutor-refresh-wrapper` visible |
| `waitForActivitySettled(page, sidePanelPage, { spanSelector })` | reading-activities "enhancement done": spans **and** `#restore-button` enabled **and** enhance button not `Processing…` |
| `injectSlowEnhance(page, { delayMs, paragraphs, paragraphText })` | slow each analysis batch for deterministic pause/progress windows |
| `waitForFixtureTabId`, `waitForSidePanelReady` | lower-level building blocks |

---

## Deterministic signals reference

The DOM signals the helpers rely on (use these directly only if a helper doesn't fit):

- **Reading-tutor processing finished:** `#reading-tutor-refresh-wrapper` is visible.
  It is `display:none` while processing, restored on completion.
- **Reading-activities enhancement finished:** `#restore-button` is **enabled**. It is
  disabled both initially *and* while processing; `setCompletedState()` enables it.
  The enhance button label also leaves `Processing…`.
- **Batch progress:** `document.documentElement.dataset.rltkBatch{Total,Processed,Failed,Completed}`.
  Read all of them in **one** `page.evaluate` inside the poll (they mutate during processing).
- **Page changed / needs re-analysis:** `#reading-tutor-refresh[data-dirty="true"]`.
- **Reading-tutor spans:** `.ʁ-reading-tutor`. **Activity spans:** `.ʁ-noun-mc`,
  `.ʁ-click-green`, `.ʁ-stress`, `.ʁ-root-mc`, etc. Roots *color* fragments are
  `.rltk-root-fragment` (a deliberately separate, non-`.ʁ` highlight — see attempt log).

---

## Attempt log

Newest first. Mark each ✅ worked / ❌ failed / 🔬 untried, and say **why**.

### ✅ Global timeout floor (60 s)
30 s default was too tight for cold-WASM analysis on CI; it was the proximate cause
of the *"pause shows resume during analysis"* timeout (`reading-tutor-refresh.spec.js`).
`timeout: 60000` in config; tests still raise further with `test.setTimeout()`.

### ✅ Canonical settle helpers + suite-wide rollout
Replaced ~15 ad-hoc "analysis complete" expressions with `waitForReadingTutorSettled`
(tutor) and `waitForActivitySettled` (activities). Killed every `page.waitForTimeout`
in specs.

### ✅ Product fixes that were really product bugs (not test bugs)
- **Pause race** (`pauseReadingTutorProcessing`): set the paused state *synchronously*
  before awaiting the abort round-trip, so a batch completion racing in doesn't clear
  the paused UI ("abort wins").
- **Spurious dirty after re-analysis:** the dirty observer re-flagged the page after a
  clean full re-analysis. Guarded the debounced check with `hasUnanalyzedCyrillicText`
  — "dirty" now means real unanalyzed Cyrillic remains. (Fixed the *"non-cyrillic or
  analyzed changes do not trigger auto refresh"* failure at the root.)
- **`generate` 5 s blind race** (sidepanel): a `Promise.race` returned empty data when a
  cold WASM load ran past 5 s, producing missing paradigm forms. Now awaits the real
  response (the offscreen `initWasmTools()` handshake guarantees one).
- **Per-batch `slowEnhance`:** extended the test-only delay hook into the multi-batch
  loop so pause/progress tests get a deterministic window.

### ✅ Atomic poll for batch progress
`batch-processing` polled `rltkBatchProcessed > 0` then *re-read* the dataset
separately; the re-read landed on a reset-to-0 at a new cycle's start. Fixed by
capturing the snapshot inside the poll.

### ✅ Remove `serial` mode + let config govern workers
All ~20 files were `mode: 'serial'` (defensive, from when the suite was flaky). Removed
it: on CI (1 worker) it only changes retry semantics (a failure no longer skips/retries
the whole describe — smaller blast radius); locally it enables parallelism. Verified the
two largest files (stress 16, selection 5) and the full suite pass in parallel.

### ✅ Cap local workers at 4
Default (~8 on a 16-core box) **crashed** tests with context-closed errors — memory
contention from too many 570 MB WASM contexts. Measured: 8 → crashes (33 s), **4 → stable
& fastest (~20 s)**, 2 → stable (32 s). CI stays at 1.

### ❌ Fixing *"pause shows resume during analysis"* with bigger timeouts / a "batch-2" pause anchor alone
Didn't hold on CI. Real causes were (a) the 30 s default and (b) the test doing **two**
full analyses (waited for initial auto-enhance to settle, then re-analyzed) + pause.
Fixed by **redesigning** the test to pause the *initial* auto-enhancement (one analysis)
and the global 60 s timeout.

### ❌ Fixing *"non-cyrillic or analyzed changes do not trigger auto refresh"* with a test-side settle wait alone
Reduced but didn't eliminate it — the cause was the product dirty-detection race (above),
not a missing wait.

### ❌ Default (8) workers
Context-closed crashes from memory contention. See "Cap local workers at 4".

### ❌ Giving roots fragments the `.ʁ` class (for a uniform `.ʁ` settle selector)
`.ʁ` is wired into restore (`content.js` removes all `.ʁ` spans), a click guard, and
hover CSS — root fragments would wrongly inherit all three, and a namespaced
`.ʁ-root-fragment` wouldn't match the bare `.ʁ` selector anyway. Kept roots' separate
`.rltk-root-fragment` rendering; pass `spanSelector` instead.

### ❌ `waitForActivitySettled` on the roots tests
roots is the heaviest activity (MC at max density). Full-settle (`#restore-button`
enabled = *all* MC generated) is far slower than what the tests need (they assert only
the first container/summary, which have their own waits) and tipped a degraded
single-worker context past the timeout. Reverted roots to direct element waits.

---

## Known remaining issues / not yet attempted

- 🔬 **Context degradation over long single-worker runs.** Heavy late tests can crash on
  CI (1 worker). Parallelism mitigates locally; CI stays serial-in-one-worker for memory.
  Root cause (offscreen WASM leak/accumulation?) not investigated.
- 🔬 **Per-worker memory.** 570 MB WASM × workers is the scaling limit. Sharing/reusing the
  offscreen across workers, or trimming model memory, would raise the safe worker count.
- 🔬 **Activity completion signal is indirect.** `waitForActivitySettled` keys off
  `#restore-button` being enabled. A dedicated content-script "enhance complete" attribute
  (like `data-rltkBatchCompleted`, but for non-batched activities) would be cleaner.
- 🔬 **`paradigm-batch.spec.js` is skipped.** If re-enabled, its `expect.poll` on progress
  text needs the atomic-snapshot pattern.
- 🔬 **Mock-setup duplication.** `openSidepanelWithMocks`-style `addInitScript` blocks are
  duplicated across `sidepanel-access-flow`, `sidepanel-reset`, `chrome-pages`. Extract a
  shared helper (deferred — the mocks differ subtly).
- 🔬 **`run-playwright.sh` browser-cache check uses the Linux path** (`~/.cache/ms-playwright`).
  On macOS browsers live in `~/Library/Caches/ms-playwright`, so the check always thinks
  they're missing and shells out to `npx playwright install`. Harmless if browsers exist,
  but worth fixing.

---

## Checklist for a new e2e test

- [ ] Open via `openFixture` / `openSidePanel` (don't inline `newPage`+`goto`+`waitForSidePanelReady`).
- [ ] Let the side panel drive injection — no manual `chrome.scripting.executeScript`.
- [ ] After enhancing, wait on the right settle helper before interacting — not bare span existence, not a sleep.
- [ ] If you only need the first element, wait on *that element* (don't force full settle on heavy activities).
- [ ] No `page.waitForTimeout`.
- [ ] If polling then asserting related state, read it atomically inside the poll.
- [ ] Clear `chrome.storage.local` in `beforeEach`; only use `mode: 'serial'` if tests genuinely depend on order/shared state (almost never).
- [ ] If it's timing-sensitive (pause/progress), use `injectSlowEnhance` + attribute anchors, not real timing.
- [ ] Keep new fixtures small and in `docs/tests/fixtures/`.
- [ ] Run it a few times locally (`workers: 4`, `retries: 0`) to shake out flakes before pushing.
