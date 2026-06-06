const { test, expect, closeNonKeepAlivePages } = require('./fixtures');


test.describe('Memory access out of bounds fixture', () => {
  test.setTimeout(300000);

  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  const MEMORY_ERROR_RE = /memory access out of bounds|WASM memory error|memory/i;

  test('memory-access-out-of-bounds', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/memory-access-out-of-bounds.html`;
    await page.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });

    const pageText = await page.evaluate(() => {
      return document.getElementById('content')?.textContent || '';
    });

    const extensionPage = await browserContext.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=0`);
    await extensionPage.waitForLoadState('domcontentloaded');

    const response = await extensionPage.evaluate(async ({ text, sourceUrl }) => {
      return await chrome.runtime.sendMessage({
        action: 'morph_analysis',
        text,
        sourceUrl
      });
    }, { text: pageText, sourceUrl: fixtureUrl });

    expect(response && response.success).toBeTruthy();

    const warnings = (response && response.data && response.data.warnings) ? response.data.warnings : [];
    const memoryWarnings = warnings.filter(warning => MEMORY_ERROR_RE.test(warning.message || ''));
    expect(memoryWarnings.length).toBe(0);

    await extensionPage.close();
  });
});
