# E2E Testing Best Practices

## What works and why
- Run Chromium headed: Chrome extensions do not load in headless, so all tests launch a headed persistent context.
- One persistent context per spec file: created in `beforeAll`, reused, and cleaned in `beforeEach/afterEach` (clear storage, close pages). This removes relaunch overhead.
- Let the side panel drive injection: opening the side panel or clicking Enhance triggers background injection; no manual pre-injection loops needed.
- Keep waits short and specific: waits target concrete DOM changes (e.g., spans rendered) with modest timeouts (5–12s where needed).
- Minimal logging/noise: avoid per-attempt injection logging; tests stay fast and readable.

## How to run
- From repo root: `npm test`
- Tests run serially within each file to share the fixture server and context.

## Patterns to follow
- Start the fixture server once per file (`beforeAll`), close in `afterAll`.
- Clear `chrome.storage.local` and close leftover pages in `beforeEach` to isolate tests.
- Avoid custom content-script injection helpers; rely on the extension’s background logic.
- Use `debugTabId` query param when opening the side panel in tests so it targets the fixture tab explicitly.
- Keep fixtures simple and fast; prefer small HTML pages in `docs/tests/fixtures/`.

## Avoid
- Headless mode for extension tests.
- Manual `chrome.scripting.executeScript` injection loops in tests.
- Long, generic sleeps; always wait on concrete DOM signals.
