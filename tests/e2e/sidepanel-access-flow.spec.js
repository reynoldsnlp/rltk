const { test, expect } = require('@playwright/test');
const path = require('path');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Sidepanel access and reset flow', () => {
  let browserContext;
  let extensionId;

  test.beforeAll(async () => {
    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

    browserContext = await launchPersistentContext(userDataDir, {
      extensionPath: pathToExtension,
    });

    const extension = await ensureExtensionReady(browserContext);
    extensionId = extension.extensionId;
  });

  test.afterAll(async () => {
    await browserContext.close();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidepanelWithMocks({
    debugTabId,
    tabUrl,
    allowAccess = false,
    sessionState = {},
    localState = {},
    readingTutorProcessedCount = 1
  } = {}) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.addInitScript((args) => {
      const {
        debugTabId,
        tabUrl,
        allowAccess,
        sessionState,
        localState,
        readingTutorProcessedCount
      } = args;

      window.__allowAccess = allowAccess;
      window.__runtimeMessages = [];
      window.__dispatchRuntimeMessage = (payload) => {
        (window.__runtimeMessageListeners || []).forEach((listener) => listener(payload, {}, () => {}));
      };

      const originalOnMessageAdd = chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage);
      chrome.runtime.onMessage.addListener = (listener) => {
        window.__runtimeMessageListeners = window.__runtimeMessageListeners || [];
        window.__runtimeMessageListeners.push(listener);
        return originalOnMessageAdd(listener);
      };

      const originalTabsGet = chrome.tabs.get.bind(chrome.tabs);
      chrome.tabs.get = (tabId) => {
        if (tabId === debugTabId) {
          return Promise.resolve({ id: tabId, url: tabUrl });
        }
        return originalTabsGet(tabId);
      };

      const originalTabsSendMessage = chrome.tabs.sendMessage.bind(chrome.tabs);
      chrome.tabs.sendMessage = (tabId, message) => {
        if (tabId === debugTabId && !window.__allowAccess) {
          return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
        }
        if (message && message.action === 'get_reading_tutor_status') {
          return Promise.resolve({ success: true, count: readingTutorProcessedCount });
        }
        return originalTabsSendMessage(tabId, message);
      };

      const originalRuntimeSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
      chrome.runtime.sendMessage = (message) => {
        window.__runtimeMessages.push(message);
        if (message && message.action === 'inject_content_script') {
          return Promise.resolve({ success: window.__allowAccess });
        }
        if (message && message.action === 'enhance') {
          return Promise.resolve({ success: true });
        }
        if (message && message.action === 'get_reading_tutor_status') {
          return Promise.resolve({ success: true, count: readingTutorProcessedCount });
        }
        if (message && message.action === 'get_text_hash') {
          return Promise.resolve({ success: true, hash: 'hash' });
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
    }, { debugTabId, tabUrl, allowAccess, sessionState, localState, readingTutorProcessedCount });

    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${debugTabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });
    return sidePanelPage;
  }

  test('denied access clears reading tutor UI and shows Access Required modal', async () => {
    const sidePanelPage = await openSidepanelWithMocks({
      debugTabId: 1,
      tabUrl: 'https://example.com',
      allowAccess: false
    });

    const accessModal = sidePanelPage.locator('#access-modal');
    const chromeModal = sidePanelPage.locator('#chrome-access-modal');
    const readingTutorResults = sidePanelPage.locator('#reading-tutor-results');
    const readingTutorInstructions = sidePanelPage.locator('#reading-tutor-instructions');

    await expect(accessModal).toBeVisible();
    await expect(chromeModal).toBeHidden();
    await expect(readingTutorResults).toBeEmpty();
    await expect(readingTutorInstructions).toBeVisible();
  });

  test('chrome pages show chrome modal', async () => {
    const sidePanelPage = await openSidepanelWithMocks({
      debugTabId: 2,
      tabUrl: 'chrome://version',
      allowAccess: true
    });

    await expect(sidePanelPage.locator('#chrome-access-modal')).toBeVisible();
    await expect(sidePanelPage.locator('#access-modal')).toBeHidden();
  });

  test('chrome injection errors show chrome modal', async () => {
    const sidePanelPage = await openSidepanelWithMocks({
      debugTabId: 4,
      tabUrl: 'chrome://extensions',
      allowAccess: false
    });

    await sidePanelPage.evaluate(() => {
      chrome.runtime.sendMessage = () => Promise.resolve({
        success: false,
        error: 'Cannot access this page. Script injection failed: Cannot access a chrome:// URL'
      });
      chrome.tabs.get = () => Promise.reject(new Error('tabs.get failed'));
    });

    await sidePanelPage.evaluate(() => {
      const listeners = window.__runtimeMessageListeners || [];
      listeners.forEach((listener) => listener({ action: 'access_granted', tabId: 4 }, {}, () => {}));
    });

    await expect(sidePanelPage.locator('#chrome-access-modal')).toBeVisible();
    await expect(sidePanelPage.locator('#access-modal')).toBeHidden();
  });

  test('access granted triggers reading tutor processing on the new tab', async () => {
    const debugTabId = 3;
    const sidePanelPage = await openSidepanelWithMocks({
      debugTabId,
      tabUrl: 'https://example.com',
      allowAccess: false,
      readingTutorProcessedCount: 1
    });

    await expect(sidePanelPage.locator('#access-modal')).toBeVisible();

    await sidePanelPage.evaluate((tabId) => {
      window.__allowAccess = true;
      window.__dispatchRuntimeMessage({ action: 'access_granted', tabId });
    }, debugTabId);

    await expect.poll(async () => {
      return sidePanelPage.evaluate(() => {
        return window.__runtimeMessages.some((message) => message && message.action === 'enhance');
      });
    }).toBe(true);
  });
});
