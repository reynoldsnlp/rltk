// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForReadingTutorSettled } = require('./test-helpers');


test.describe('Reading Tutor stress select', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openReadingTutor(browserContext, extensionId, tabId) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);
    return sidePanelPage;
  }

  test('stress select is present and defaults to Mark stress', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    const stressSelect = sidePanelPage.locator('#reading-tutor-stress');
    await expect(stressSelect).toBeVisible();
    await expect(stressSelect).toHaveValue('mark');
  });

  test('Mark stress shows accent marks in reading tutor spans', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');

    // At least one span with unambiguous stress should show a combining acute accent.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );
  });

  test('No stress restores original text after Mark stress', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    // Enable mark stress and wait for accents to appear.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );

    // Switch back to No stress — all accent marks should disappear.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'none');
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301')),
      { timeout: 10000 }
    );
  });

  test('Hover stress reveals accent on mouseenter and hides on mouseleave', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    await sidePanelPage.selectOption('#reading-tutor-stress', 'hover');

    // No accent marks without hovering.
    const hasAccentWithoutHover = await page.evaluate(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301'))
    );
    expect(hasAccentWithoutHover).toBe(false);

    // Poll until a span responds to mouseenter with an accent mark — this also
    // verifies that mouseleave restores the original text.
    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
      for (const span of spans) {
        span.dispatchEvent(new Event('mouseenter', { bubbles: true }));
        const hasAccent = (span.textContent || '').includes('\u0301');
        span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
        if (hasAccent) return true;
      }
      return false;
    }, { timeout: 30000 });

    // After all mouseleave events, no accent marks should remain.
    const hasAccentAfterLeave = await page.evaluate(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301'))
    );
    expect(hasAccentAfterLeave).toBe(false);
  });

  test('stress is applied automatically when analysis completes with mode already selected', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    // Select Mark stress, then trigger a full re-analysis.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    await refreshButton.click();

    // Wait for the re-analysis to complete and produce new spans.
    await waitForReadingTutorSettled(page, sidePanelPage);

    // Stress should be applied automatically — no further interaction required.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );
  });

  test('Mark stress does not duplicate words split across per-character spans', async ({ page, browserContext, extensionId }, testInfo) => {
    // Reproduces the Duolingo bug: each character of a word lives in its own
    // span, so a token spans many text nodes. Stress mode must show each
    // fragment's slice of the stressed form, not the whole word per fragment.
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-split-spans.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');

    // Wait for unambiguous stress to be applied to the split words.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('́')),
      { timeout: 30000 }
    );

    // The visible text of the word should read once, correctly stressed —
    // not repeated once per character (the bug produced "ча́сто" twice over).
    const targetText = await page.evaluate(() => document.getElementById('target').textContent);
    expect(targetText).toContain('ча́сто');
    expect(targetText).not.toContain('ча́сточа́сто');
    expect(targetText).toContain('све́жие');
    expect(targetText).not.toContain('све́жиесве́жие');
    // Whole-sentence sanity: no word appears back-to-back with itself.
    expect(/(\p{L}{2,})\1/u.test(targetText.replace(/\s+/g, ''))).toBe(false);
  });


  test('Clicking one character of a split word highlights the whole word', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-split-spans.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    const result = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
      const indexClassOf = (el) => Array.from(el.classList).find(c => /^ʁ[0-9]+$/.test(c));
      const groups = {};
      for (const s of spans) {
        const cls = indexClassOf(s);
        if (!cls) continue;
        (groups[cls] = groups[cls] || []).push(s);
      }
      // A split word has more than one fragment sharing its cohort-index class.
      const splitClass = Object.keys(groups).find(c => groups[c].length > 1);
      if (!splitClass) return { ok: false, reason: 'no split word found' };
      const group = groups[splitClass];

      // Click a single character fragment.
      group[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const highlighted = group.filter(s => s.classList.contains('ʁ-highlighted')).length;

      // Clicking the same word again should clear the whole group.
      group[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const afterToggleOff = group.filter(s => s.classList.contains('ʁ-highlighted')).length;

      return { ok: true, total: group.length, highlighted, afterToggleOff };
    });

    expect(result.ok).toBe(true);
    expect(result.total).toBeGreaterThan(1);
    // Every fragment of the word is highlighted, not just the clicked character.
    expect(result.highlighted).toBe(result.total);
    // Clicking again clears the whole word.
    expect(result.afterToggleOff).toBe(0);
  });

});
