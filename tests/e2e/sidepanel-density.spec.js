const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

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

    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('saves density in side panel and applies to nouns MC/Cloze', async () => {
    // 1) Open nouns fixture
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/nouns.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    // 2) Open side panel targeting the fixture tab
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

    // Move the slider to a sparser setting and rerun enhancement
    await sidePanelPage.$eval('#density-slider', (el) => {
      el.value = '10';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(sidePanelPage.locator('#restore-button')).toBeEnabled();
    await sidePanelPage.click('#restore-button');
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length === 0, { timeout: 12000 });
    await sidePanelPage.click('#enhance-button');
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
