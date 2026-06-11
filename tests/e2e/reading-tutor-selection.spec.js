// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');


test.describe('Reading Tutor selection analysis', () => {
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

  // Wait for the auto-triggered reading tutor analysis to complete.
  // This also ensures the content script is injected before we try to make selections.
  async function waitForAnalysis(page, sidePanelPage) {
    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 60000 }
    );
    // The refresh-wrapper is hidden (display:none) while processing and shown when done.
    // Waiting for it to be visible is a reliable "processing finished" signal.
    await expect(sidePanelPage.locator('#reading-tutor-refresh-wrapper')).toBeVisible({ timeout: 10000 });
  }

  // Select span text on the page.  Finds the first span whose textContent includes
  // startWord and the first span whose textContent includes endWord, then creates a
  // browser selection spanning those two spans (including any content in between).
  async function selectSpanTextOnPage(page, startWord, endWord) {
    await page.evaluate(({ startWord, endWord }) => {
      const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
      // dataset.originalText is always the un-stressed original word (set at span creation).
      // Fall back to normalizing textContent to strip combining stress marks (U+0300-U+036F).
      const normalize = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchWord = (s, word) => {
        const orig = s.dataset.originalText;
        return orig !== undefined ? orig.includes(word) : normalize(s.textContent).includes(word);
      };
      const startSpan = spans.find(s => matchWord(s, startWord));
      const endSpan   = endWord ? spans.find(s => matchWord(s, endWord)) : startSpan;
      if (!startSpan || !endSpan) {
        throw new Error(`Could not find spans for "${startWord}" / "${endWord}"`);
      }
      const range = document.createRange();
      range.setStart(startSpan.firstChild || startSpan, 0);
      range.setEnd(endSpan, endSpan.childNodes.length);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, { startWord, endWord });
  }

  async function clearSelectionOnPage(page) {
    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      document.dispatchEvent(new Event('selectionchange'));
    });
  }

  test('refresh button shows refresh icon and no badge by default', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    const badge = sidePanelPage.locator('#reading-tutor-selection-badge');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');

    // No text selected — badge should not have the 'visible' class.
    await expect(badge).not.toHaveClass(/visible/);
    // Button should show the default re-analysis label.
    await expect(refreshButton).toHaveAttribute('aria-label', 'Force re-analysis of page');
  });

  test('selecting text shows play icon and blue badge', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    // Wait for the auto-triggered analysis to finish — this ensures the content
    // script is injected and will forward selectionchange events.
    await waitForAnalysis(page, sidePanelPage);

    // Select "тестовый текст" by spanning the two word spans.
    await selectSpanTextOnPage(page, 'тестовый', 'текст');

    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    const badge = sidePanelPage.locator('#reading-tutor-selection-badge');

    // Sidepanel reacts after the 150 ms debounce + message round-trip.
    await expect(refreshButton).toHaveAttribute('aria-label', 'Analyze selected text only', { timeout: 5000 });
    await expect(badge).toHaveClass(/visible/);
    await expect(badge).not.toHaveClass(/analyzed/);
  });

  test('deselecting text reverts to refresh icon and hides badge', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    // Wait for analysis so the content script is active.
    await waitForAnalysis(page, sidePanelPage);

    // Select, wait for play mode, then clear the selection.
    await selectSpanTextOnPage(page, 'тестовый', 'текст');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    await expect(refreshButton).toHaveAttribute('aria-label', 'Analyze selected text only', { timeout: 5000 });

    await clearSelectionOnPage(page);

    await expect(refreshButton).toHaveAttribute('aria-label', 'Force re-analysis of page', { timeout: 5000 });
    await expect(sidePanelPage.locator('#reading-tutor-selection-badge')).not.toHaveClass(/visible/);
  });

  test('clicking play analyzes only selected text and shows X with gray badge', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    // Wait for analysis so the content script is active.
    await waitForAnalysis(page, sidePanelPage);

    // Select "тестовый текст" (not "Это") using spans.
    await selectSpanTextOnPage(page, 'тестовый', 'текст');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    await expect(refreshButton).toHaveAttribute('aria-label', 'Analyze selected text only', { timeout: 5000 });

    // Click the play button.
    await refreshButton.click();

    // Wait until the selection-only spans are in place: spans must exist AND
    // "Это" must NOT be among them (ruling out the initial full-analysis spans).
    // Use dataset.originalText (un-stressed original) because stress='mark' can change textContent.
    await page.waitForFunction(
      () => {
        const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
        const getText = s => s.dataset.originalText !== undefined ? s.dataset.originalText : (s.textContent || '');
        return spans.length > 0 && !spans.some(s => getText(s).includes('Это'));
      },
      { timeout: 60000 }
    );

    // Only the selected words should have spans — "Это" must not.
    const spanTexts = await page.evaluate(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .map(s => s.dataset.originalText !== undefined ? s.dataset.originalText : (s.textContent || ''))
    );
    expect(spanTexts.some(t => /тестовый|текст/.test(t))).toBe(true);
    expect(spanTexts.some(t => /Это/.test(t))).toBe(false);

    // Button should now show X ("Re-analyze full page"), badge should be gray (analyzed).
    await expect(refreshButton).toHaveAttribute('aria-label', 'Re-analyze full page', { timeout: 5000 });
    const badge = sidePanelPage.locator('#reading-tutor-selection-badge');
    await expect(badge).toHaveClass(/visible/);
    await expect(badge).toHaveClass(/analyzed/);
  });

  test('clicking X triggers full re-analysis and resets UI to refresh state', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    // Wait for analysis so the content script is active.
    await waitForAnalysis(page, sidePanelPage);

    // Run selection-only analysis first.
    await selectSpanTextOnPage(page, 'тестовый', 'текст');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    await expect(refreshButton).toHaveAttribute('aria-label', 'Analyze selected text only', { timeout: 5000 });
    await refreshButton.click();
    // Use the same reliable condition: spans exist but "Это" is absent (selection-only result).
    // Use dataset.originalText (un-stressed original) because stress='mark' can change textContent.
    await page.waitForFunction(
      () => {
        const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
        const getText = s => s.dataset.originalText !== undefined ? s.dataset.originalText : (s.textContent || '');
        return spans.length > 0 && !spans.some(s => getText(s).includes('Это'));
      },
      { timeout: 60000 }
    );
    await expect(refreshButton).toHaveAttribute('aria-label', 'Re-analyze full page', { timeout: 5000 });

    // Click X — should trigger full re-analysis.
    await refreshButton.click();

    // After full analysis "Это" should also have a reading-tutor span.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => {
          const t = s.dataset.originalText !== undefined ? s.dataset.originalText : (s.textContent || '');
          return t.includes('Это');
        }),
      { timeout: 60000 }
    );

    // The "Это" span existing only means analysis has started streaming spans;
    // the button's resting label doesn't stabilize until processing fully
    // settles. Wait for that before asserting, or we catch a transient
    // processing/dirty label ("Changes detected...").
    await waitForAnalysis(page, sidePanelPage);

    // UI should be back to normal: refresh label, badge hidden.
    await expect(refreshButton).toHaveAttribute('aria-label', 'Force re-analysis of page', { timeout: 15000 });
    await expect(sidePanelPage.locator('#reading-tutor-selection-badge')).not.toHaveClass(/visible/);
  });
});
