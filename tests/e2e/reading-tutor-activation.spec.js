const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Reading Tutor activation', () => {
  let browserContext;
  let extensionId;
  let serverInstance;
  let port;
  let page;

  test.beforeAll(async () => {
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

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
    serverInstance.close();
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

  test('processes the current page without tab switching', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 15000 }
    );

    const readingTutorCount = await page.locator('.ʁ-reading-tutor').count();
    expect(readingTutorCount).toBeGreaterThan(0);
  });
});
