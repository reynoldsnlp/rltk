// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForSidePanelReady } = require('./test-helpers');


test.describe('Sidepanel chrome:// switch modal', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('switching to chrome:// tab shows chrome modal', async ({ browserContext, extensionId }) => {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.addInitScript(() => {
      window.__sidepanelListenerStore = [];
      const originalAdd = chrome.tabs.onActivated.addListener.bind(chrome.tabs.onActivated);
      chrome.tabs.onActivated.addListener = (listener) => {
        window.__sidepanelListenerStore.push(listener);
        return originalAdd(listener);
      };

      const originalTabsGet = chrome.tabs.get.bind(chrome.tabs);
      chrome.tabs.get = (tabId) => {
        if (tabId === 42) {
          return Promise.resolve({ id: tabId, url: 'chrome://version' });
        }
        if (tabId === 41) {
          return Promise.resolve({ id: tabId, url: 'https://example.com' });
        }
        return originalTabsGet(tabId);
      };

      chrome.tabs.query = () => Promise.resolve([{ id: 41, active: true, currentWindow: true }]);

      chrome.tabs.sendMessage = (tabId) => {
        if (tabId === 41) {
          return Promise.resolve({ loaded: true });
        }
        return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
      };

      chrome.runtime.sendMessage = (message) => {
        if (message && message.action === 'inject_content_script') {
          return Promise.resolve({ success: false });
        }
        if (message && message.action === 'get_status') {
          return Promise.resolve({ success: true, data: { isEnhanced: false } });
        }
        if (message && message.action === 'get_reading_tutor_status') {
          return Promise.resolve({ success: true, count: 0 });
        }
        return Promise.resolve({ success: true });
      };
    });

    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await sidePanelPage.evaluate(() => {
      const listeners = window.__sidepanelListenerStore || [];
      listeners.forEach((listener) => listener({ tabId: 42 }));
    });

    const chromeModal = sidePanelPage.locator('#chrome-access-modal');
    const accessModal = sidePanelPage.locator('#access-modal');

    await expect(chromeModal).toBeVisible();
    await expect(accessModal).toBeHidden();
  });
});
