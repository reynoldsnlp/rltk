const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const server = require('./server');

test.describe.configure({ mode: 'serial' });

test.describe('Nouns Click Activity', () => {
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

    const pathToExtension = path.resolve(__dirname, '../../');
    const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const swUrl = serviceWorker.url();
    extensionId = swUrl.split('/')[2];
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
    for (const p of browserContext.pages()) {
      await p.close();
    }
  });

  async function getFixtureTabId(fixtureUrl) {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await serviceWorker.evaluate(async (targetUrl) => {
      const exact = await chrome.tabs.query({ url: targetUrl });
      if (exact.length > 0) return exact[0].id;
      const all = await chrome.tabs.query({});
      return all.length > 0 ? all[0].id : null;
    }, fixtureUrl);
    return tabId;
  }

  async function openSidePanelForActivity(tabId, topicValue, activityValue) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', topicValue);
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', activityValue);
    await sidePanelPage.click('#enhance-button');
    return sidePanelPage;
  }

  test('nouns click activity highlights on click', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns-click.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'nouns', 'click');

    // Wait for enhancement
    const nounLocator = page.locator('span.ʁ-click-green').first();
    await expect(nounLocator).toBeVisible({ timeout: 10000 });

    // Click the noun
    await nounLocator.click();

    // Check if class 'clicked' is added
    await expect(nounLocator).toHaveClass(/clicked/);

    // Check if background color changes
    await expect(nounLocator).toHaveCSS('background-color', 'rgba(0, 255, 0, 0.3)');
  });
});
