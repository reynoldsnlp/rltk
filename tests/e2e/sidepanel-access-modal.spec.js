const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Sidepanel access modal', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows Access Required modal for regular pages without access', async ({ page, browserContext, extensionId, serviceWorker }) => {
    await page.goto('https://example.com');
    await expect.poll(async () => {
      return serviceWorker.evaluate(() => {
        return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => (tabs[0] ? tabs[0].id : null));
      });
    }).not.toBeNull();

    const tabId = await serviceWorker.evaluate(() => {
      return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => (tabs[0] ? tabs[0].id : null));
    });
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    const accessModal = sidePanelPage.locator('#access-modal');
    const chromeModal = sidePanelPage.locator('#chrome-access-modal');

    await expect(accessModal).toBeVisible();
    await expect(chromeModal).toBeHidden();
  });
});
