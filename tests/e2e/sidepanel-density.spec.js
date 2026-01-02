const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const server = require('./server');

// Run serially so we can share one fixture server/port.
test.describe.configure({ mode: 'serial' });

test.describe('Side panel density for MC/Cloze', () => {
  test.setTimeout(20000);

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
    const userDataDir = `/tmp/test-user-data-dir-${Math.random()}`;

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

  test('saves density in side panel and applies to nouns MC/Cloze', async () => {
    // 1) Open nouns fixture
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    // 2) Open side panel targeting the fixture tab
    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    // Adjust minDistance to 1 via the new slider
    await sidePanelPage.$eval('#density-slider', (el) => {
      el.value = '1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Verify storage reflects the saved value
    const storedMinDistance = await browserContext.serviceWorkers()[0].evaluate(() => new Promise((resolve) => {
      chrome.storage.local.get(['rltk_token_selector_minDistance'], (res) => {
        resolve(res['rltk_token_selector_minDistance']);
      });
    }));
    expect(storedMinDistance).toBe(1);

    await sidePanelPage.click('#enhance-button');

    // Wait for MC spans to appear to confirm enhancement ran
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length > 0, { timeout: 12000 });
    const mcSpan = page.locator('.ʁ-noun-mc').first();
    await expect(mcSpan).toBeVisible({ timeout: 12000 });

    // Move the slider to a sparser setting and ensure enhancement reruns automatically
    await sidePanelPage.$eval('#density-slider', (el) => {
      el.value = '10';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length === 0, { timeout: 12000 });
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length > 0, { timeout: 12000 });
    const rerunCount = await page.locator('.ʁ-noun-mc').count();
    expect(rerunCount).toBeGreaterThan(0);

    // Switch to cloze and rerun
    await sidePanelPage.selectOption('#activity-menu', 'cloze');
    await sidePanelPage.click('#enhance-button');
    const clozeSpan = page.locator('.ʁ-noun-cloze').first();
    await expect(clozeSpan).toBeVisible({ timeout: 12000 });
  });
});
