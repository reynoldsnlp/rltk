// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openFixture, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Dev mode option', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('options toggle shows dev-only side panel features live', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'nouns.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);

    // Assert the label's own display: whether its sub-tab is showing is irrelevant here.
    const labelDisplay = () => sidePanelPage.locator('label:has(#highlight-ambiguity)')
      .evaluate(el => getComputedStyle(el).display);
    expect(await labelDisplay()).toBe('none');

    const optionsPage = await browserContext.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/rltk/options/options.html`);
    const devMode = optionsPage.locator('#dev-mode');
    await expect(devMode).not.toBeChecked();

    await devMode.check();
    await expect.poll(() => serviceWorker.evaluate(() => new Promise(resolve =>
      chrome.storage.local.get(['rltk_dev_mode'], res => resolve(res.rltk_dev_mode))))).toBe(true);
    await expect.poll(labelDisplay).toBe('block');

    // Reloaded options page reflects the saved value.
    await optionsPage.reload();
    await expect(optionsPage.locator('#dev-mode')).toBeChecked();

    await optionsPage.locator('#dev-mode').uncheck();
    await expect.poll(labelDisplay).toBe('none');
  });

  test('highlights tokens with more than one reading', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.set({ rltk_dev_mode: true }, resolve)));
    const { tabId } = await openFixture(page, browserContext, testInfo, 'nouns.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    // The class marks exactly the tokens CG left with >1 reading.
    const marks = await page.$$eval('.ʁ-reading-tutor', spans => spans.map(s => ({
      ambiguous: s.classList.contains('rltk-ambiguous'),
      readings: JSON.parse(s.getAttribute('data-readings') || '[]').length
    })));
    expect(marks.some(m => m.ambiguous)).toBe(true);
    for (const m of marks) expect(m.ambiguous).toBe(m.readings > 1);

    await sidePanelPage.click('.sub-tab-button[data-subtab="grammar-highlighter"]');
    const styleText = () => page.evaluate(() =>
      document.getElementById('rltk-grammar-highlighter-styles')?.textContent || '');

    await sidePanelPage.locator('#highlight-ambiguity').check();
    await expect.poll(styleText).toContain('.rltk-ambiguous');
    const outline = await page.locator('.rltk-ambiguous').first().evaluate(el => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('dashed');

    await sidePanelPage.locator('#highlight-ambiguity').uncheck();
    await expect.poll(styleText).not.toContain('.rltk-ambiguous');
  });
});
