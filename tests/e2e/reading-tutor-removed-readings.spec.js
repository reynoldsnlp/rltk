// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
//
// Each reading-tutor token stores the readings the constraint grammar removed
// (from CG3's trace output) in data-removed-readings, and the side panel lists
// them in the lemma-group header tooltip under "REMOVED:".
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openFixture, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Reading Tutor removed readings', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('tokens carry CG-removed readings, shown in the lemma tooltip', async ({ page, browserContext, extensionId }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'reading-tutor-removed-readings.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    const tokens = await page.$$eval('.ʁ-reading-tutor', spans => Object.fromEntries(spans.map(s => [
      s.dataset.originalText || s.textContent,
      { kept: JSON.parse(s.dataset.readings), removed: JSON.parse(s.dataset.removedReadings) }
    ])));

    // "в": only the preposition survives; its noun readings were removed.
    expect(tokens['в'].kept.map(r => r.ts[0])).toEqual(['Pr']);
    expect(tokens['в'].removed.length).toBeGreaterThan(0);
    expect(tokens['в'].removed.every(r => r.l === 'в' && r.ts[0] === 'N')).toBe(true);
    expect(tokens['живу'].removed).toEqual([]);

    // Trace tags (e.g. "SELECT:") must not leak into any reading's tags.
    for (const { kept, removed } of Object.values(tokens)) {
      for (const r of [...kept, ...removed]) {
        expect(r.ts.filter(t => /^[A-Z][A-Z-]*:/.test(t))).toEqual([]);
      }
    }

    await page.locator('.ʁ-reading-tutor', { hasText: /^в$/ }).first().click();
    const header = sidePanelPage.locator('#reading-tutor-results .lemma-group h4').first();
    await expect(header).toHaveAttribute('title', /^Pr\n\nREMOVED:\nв N /, { timeout: 20000 });

    await page.locator('.ʁ-reading-tutor', { hasText: 'живу' }).first().click();
    await expect(header).not.toHaveAttribute('title', /REMOVED/, { timeout: 20000 });
  });

  // Regression: page batches usually start with whitespace, for which CG3's JSONL
  // conversion emits an extra word-less entry. Removed readings were matched to
  // entries by raw index, so the counts never lined up and every token got [].
  test('multi-paragraph pages still get removed readings', async ({ page, browserContext, extensionId }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'nouns.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    const nonEmpty = await page.$$eval('.ʁ-reading-tutor', spans =>
      spans.filter(s => (s.dataset.removedReadings || '[]') !== '[]').length);
    expect(nonEmpty).toBeGreaterThan(0);
  });
});
