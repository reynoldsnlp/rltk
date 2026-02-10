const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Reading Tutor metadata', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('returns cached token count and restore hash', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    const domCount = await page.locator('.ʁ-reading-tutor').count();
    expect(domCount).toBeGreaterThan(0);

    const status = await serviceWorker.evaluate(async (targetTabId) => {
      const response = await chrome.tabs.sendMessage(targetTabId, { action: 'get_reading_tutor_status' });
      return response;
    }, tabId);

    expect(status).toBeTruthy();
    expect(status.success).toBe(true);
    expect(status.count).toBe(domCount);

    const restoreHash = await serviceWorker.evaluate(async (targetTabId) => {
      const response = await chrome.tabs.sendMessage(targetTabId, { action: 'get_reading_tutor_restore_hash' });
      return response?.hash || null;
    }, tabId);

    const restoreHashRepeat = await serviceWorker.evaluate(async (targetTabId) => {
      const response = await chrome.tabs.sendMessage(targetTabId, { action: 'get_reading_tutor_restore_hash' });
      return response?.hash || null;
    }, tabId);

    expect(restoreHash).toBeTruthy();
    expect(restoreHashRepeat).toBe(restoreHash);
  });
});
