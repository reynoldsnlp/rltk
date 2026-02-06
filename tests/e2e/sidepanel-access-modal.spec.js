const { test, expect } = require('@playwright/test');
const path = require('path');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Sidepanel access modal', () => {
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
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));

    await closeNonKeepAlivePages(browserContext);
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows Access Required modal for regular pages without access', async () => {
    await page.goto('https://example.com');
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
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
