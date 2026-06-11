// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForSidePanelReady } = require('./test-helpers');


test.describe('Sidepanel tab reset states', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidepanelWithMocks(browserContext, extensionId, { debugTabId, tabUrl, sessionState = {}, localState = {}, allowAccess = false } = {}) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.addInitScript((args) => {
      const { debugTabId, tabUrl, sessionState, localState, allowAccess } = args;

      const originalTabsGet = chrome.tabs.get.bind(chrome.tabs);
      chrome.tabs.get = (tabId) => {
        if (tabId === debugTabId) {
          return Promise.resolve({ id: tabId, url: tabUrl });
        }
        return originalTabsGet(tabId);
      };

      const originalTabsSendMessage = chrome.tabs.sendMessage.bind(chrome.tabs);
      chrome.tabs.sendMessage = (tabId, message) => {
        if (tabId === debugTabId && !allowAccess) {
          return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
        }
        return originalTabsSendMessage(tabId, message);
      };

      const originalRuntimeSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
      chrome.runtime.sendMessage = (message) => {
        if (message && message.action === 'inject_content_script') {
          return Promise.resolve({ success: allowAccess });
        }
        return originalRuntimeSendMessage(message);
      };

      if (chrome.storage && chrome.storage.session) {
        chrome.storage.session.get = (keys, callback) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((key) => {
            if (sessionState && Object.prototype.hasOwnProperty.call(sessionState, key)) {
              result[key] = sessionState[key];
            }
          });
          if (typeof callback === 'function') {
            callback(result);
            return undefined;
          }
          return Promise.resolve(result);
        };
        chrome.storage.session.set = (items, callback) => {
          if (typeof callback === 'function') {
            callback();
            return undefined;
          }
          return Promise.resolve();
        };
      }

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get = (keys, callback) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((key) => {
            if (localState && Object.prototype.hasOwnProperty.call(localState, key)) {
              result[key] = localState[key];
            }
          });
          if (typeof callback === 'function') {
            callback(result);
            return undefined;
          }
          return Promise.resolve(result);
        };
        chrome.storage.local.set = (items, callback) => {
          if (typeof callback === 'function') {
            callback();
            return undefined;
          }
          return Promise.resolve();
        };
      }
    }, { debugTabId, tabUrl, sessionState, localState, allowAccess });

    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${debugTabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });
    return sidePanelPage;
  }

  test('shows access required modal for no-access tabs', async ({ browserContext, extensionId }) => {
    const sidePanelPage = await openSidepanelWithMocks(browserContext, extensionId, {
      debugTabId: 1,
      tabUrl: 'https://example.com',
      allowAccess: false
    });

    await expect(sidePanelPage.locator('#access-modal')).toBeVisible();
    await expect(sidePanelPage.locator('#chrome-access-modal')).toBeHidden();
  });

  test('shows chrome modal for chrome:// tabs', async ({ browserContext, extensionId }) => {
    const sidePanelPage = await openSidepanelWithMocks(browserContext, extensionId, {
      debugTabId: 2,
      tabUrl: 'chrome://version',
      allowAccess: true
    });

    await expect(sidePanelPage.locator('#chrome-access-modal')).toBeVisible();
    await expect(sidePanelPage.locator('#access-modal')).toBeHidden();
  });

  test('loads previous tab state when present', async ({ browserContext, extensionId }) => {
    const tabId = 3;
    const stateKey = `tabState_${tabId}`;
    const sidePanelPage = await openSidepanelWithMocks(browserContext, extensionId, {
      debugTabId: tabId,
      tabUrl: 'https://example.com',
      allowAccess: true,
      sessionState: {
        [stateKey]: {
          selections: {
            topic: 'nouns',
            filter: 'Sg',
            activity: 'color'
          }
        }
      },
      localState: {
        [stateKey]: {
          selections: {
            topic: 'nouns',
            filter: 'Sg',
            activity: 'color'
          }
        }
      }
    });

    await expect(sidePanelPage.locator('#topic-menu')).toHaveValue('nouns');
    await expect(sidePanelPage.locator('#filter-menu')).toHaveValue('Sg');
    await expect(sidePanelPage.locator('#activity-menu')).toHaveValue('color');
  });

  test('starts a new tab session from stored defaults', async ({ browserContext, extensionId }) => {
    const sidePanelPage = await openSidepanelWithMocks(browserContext, extensionId, {
      debugTabId: 4,
      tabUrl: 'https://example.com',
      allowAccess: true,
      localState: {
        topic: 'verbs',
        filter: 'Perf',
        activity: 'click'
      }
    });

    await expect(sidePanelPage.locator('#topic-menu')).toHaveValue('verbs');
    await expect(sidePanelPage.locator('#filter-menu')).toHaveValue('Perf');
    await expect(sidePanelPage.locator('#activity-menu')).toHaveValue('click');
  });
});
