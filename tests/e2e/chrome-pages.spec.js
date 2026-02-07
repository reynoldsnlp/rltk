const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForSidePanelReady } = require('./test-helpers');

// Run serially to share a single context.
test.describe.configure({ mode: 'serial' });

test.describe('Chrome internal pages', () => {
  test.beforeEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows chrome:// modal instead of access required', async ({ browserContext, extensionId }) => {
    const debugTabId = 1;

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.addInitScript(() => {
      const originalGet = chrome.tabs.get.bind(chrome.tabs);
      chrome.tabs.get = (tabId) => {
        if (tabId === 1) {
          return Promise.resolve({ id: tabId, url: 'chrome://version' });
        }
        return originalGet(tabId);
      };
    });
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${debugTabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    const chromeModal = sidePanelPage.locator('#chrome-access-modal');
    const accessModal = sidePanelPage.locator('#access-modal');

    await expect(chromeModal).toBeVisible();
    await expect(accessModal).toBeHidden();
  });
});
