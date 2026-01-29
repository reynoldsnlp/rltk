const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext } = require('./launch-context');

// Follow the same serial pattern as the other e2e tests
test.describe.configure({ mode: 'serial' });

test.describe('Distractor Accent Handling', () => {
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

  test('Nouns MC strips accents from originally stressed tokens', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;

    // Open the fixture and keep it frontmost
    const page = await browserContext.newPage();
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    // Open the side panel targeting the fixture tab
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

    // Navigate to Reading activities -> Nouns -> MC following existing test pattern
    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    await sidePanelPage.click('#enhance-button');

    // Wait for MC enhancement to land inside the stressed example block
    const stressedCase = page.locator('.case', { hasText: 'Stressed example' });
    const stressedSelect = stressedCase.locator('.ʁ-noun-mc select').first();
    await expect(stressedSelect).toBeVisible({ timeout: 12000 });

    // Extract options from the select that corresponds to the stressed noun
    const options = await stressedSelect.evaluate((sel) => Array.from(sel.options).map(o => o.textContent || ''));

    // Assert: no option should carry an accent mark; base form should be present
    const hasAccent = options.some(o => o.normalize('NFD').match(/\u0301/));
    const hasBaseForm = options.some(o => o.normalize('NFD').replace(/\u0301/g, '') === 'дом');

    expect(hasAccent).toBeFalsy();
    expect(hasBaseForm).toBeTruthy();
  });
});
