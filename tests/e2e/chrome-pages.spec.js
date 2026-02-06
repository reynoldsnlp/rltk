const { test, expect } = require('@playwright/test');
const path = require('path');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForSidePanelReady } = require('./test-helpers');

// Run serially to share a single context.
test.describe.configure({ mode: 'serial' });

test.describe('Chrome internal pages', () => {
  let browserContext;
  let extensionId;
  let page;

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

  test.beforeEach(async () => {
    await closeNonKeepAlivePages(browserContext);
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows chrome:// modal instead of access required', async () => {
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
