const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

// Run serially so we can share one fixture server/port.
test.describe.configure({ mode: 'serial' });

test.describe('Enhancement reuse avoids reprocessing', () => {
  test.setTimeout(60000);

  let browserContext;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = `/tmp/test-user-data-dir-${Math.random()}`;

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
  });

  test('re-clicking enhance keeps existing spans', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;
    const page = await browserContext.newPage();

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();

    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    await sidePanelPage.click('#enhance-button');
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length > 0, { timeout: 12000 });

    const firstSpanHandle = await page.$('.ʁ-noun-mc');
    expect(firstSpanHandle).not.toBeNull();

    const isConnectedBefore = await firstSpanHandle.evaluate(el => el.isConnected);
    expect(isConnectedBefore).toBe(true);

    // Click enhance again - should skip and keep existing spans
    await sidePanelPage.click('#enhance-button');
    // Allow time for enhance to potentially reprocess (it should skip)
    await page.waitForTimeout(600);

    const isConnectedAfter = await firstSpanHandle.evaluate(el => el.isConnected);
    expect(isConnectedAfter).toBe(true);
  });
});
