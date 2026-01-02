const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const server = require('./server');

test.describe.configure({ mode: 'serial' });

test.describe('Tab Synchronization and State Restoration', () => {
  let browserContext;
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

  test('Reading Tutor sub-tabs restore state correctly', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;
    const page = await browserContext.newPage();

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    const sidePanelPage = await browserContext.newPage();

    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    // Wait for side panel to initialize
    await sidePanelPage.waitForLoadState('domcontentloaded');

    // 1. Initial State: Reading Tutor active, Translations sub-tab active
    await expect(sidePanelPage.locator('.tab-button[data-tab="reading-tutor"]')).toHaveClass(/active/);
    await expect(sidePanelPage.locator('.sub-tab-button[data-subtab="translations-and-tables"]')).toHaveClass(/active/);

    // Wait for enhancement (Reading Tutor is auto-activated)
    // Increase timeout just in case
    await page.waitForSelector('.ʁ-reading-tutor', { timeout: 10000 });

    // 2. Select a word
    // Click the first word
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        const el = document.querySelector('.ʁ-reading-tutor');
        if (el) el.click();
    });

    // Verify highlighted on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // Verify analysis in side panel
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
    await expect(sidePanelPage.locator('#reading-tutor-results')).toContainText('MC');

    // 3. Switch to Grammar Highlighter
    await sidePanelPage.click('.sub-tab-button[data-subtab="grammar-highlighter"]');

    // Verify word deselected on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).not.toHaveClass(/ʁ-highlighted/);

    // Verify side panel shows filters
    await expect(sidePanelPage.locator('#grammar-highlighter-filters')).toBeVisible();

    // 4. Switch back to Translations
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');

    // Verify word re-highlighted on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // Verify analysis restored in side panel
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
  });

  test('Switching between main tabs restores state', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;
    const page = await browserContext.newPage();
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    // 1. Start in Reading Tutor, select a word
    await page.waitForSelector('.ʁ-reading-tutor');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        const el = document.querySelector('.ʁ-reading-tutor');
        if (el) el.click();
    });
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // 2. Switch to Reading Activities
    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');

    // Verify page restored (no Reading Tutor spans)
    // Note: restorePage removes the .ʁ-reading-tutor class or the spans entirely?
    // Based on implementation, it likely removes the spans or classes.
    // Let's check if the element still has the class.
    await expect(page.locator('.ʁ-reading-tutor')).toHaveCount(0);

    // 3. Enhance in Reading Activities
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.selectOption('#activity-menu', 'color');
    await sidePanelPage.click('#enhance-button');

    // Verify Nouns enhancement
    await page.waitForSelector('.ʁ-noun');
    await expect(page.locator('.ʁ-noun').first()).toBeVisible();

    // 4. Switch back to Reading Tutor
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    // Verify Nouns enhancement removed
    await expect(page.locator('.ʁ-nouns')).toHaveCount(0);

    // Verify Reading Tutor restored
    await page.waitForSelector('.ʁ-reading-tutor');

    // Verify previous selection restored
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
  });
});
