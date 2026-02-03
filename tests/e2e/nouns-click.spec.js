const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Nouns Click Activity', () => {
  test.setTimeout(60000);

  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
  let port;

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
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanelForActivity(tabId, topicValue, activityValue) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', topicValue);
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', activityValue);
    await sidePanelPage.waitForFunction(() => {
      const btn = document.getElementById('enhance-button');
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    await sidePanelPage.click('#enhance-button');
    return sidePanelPage;
  }

  test('nouns click activity highlights on click', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns-click.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'nouns', 'click');

    // Wait for enhancement
    const nounLocator = page.locator('span.ʁ-click-green').first();
    await expect(nounLocator).toBeVisible({ timeout: 20000 });

    // Click the noun
    await nounLocator.evaluate(node => node.click());

    // Check if class 'clicked' is added
    await expect(nounLocator).toHaveClass(/clicked/);

    // Check if background color changes
    await expect(nounLocator).toHaveCSS('background-color', 'rgba(0, 255, 0, 0.3)');

    // Verify we didn't navigate
    expect(page.url()).toContain('nouns-click.html');
  });
});
