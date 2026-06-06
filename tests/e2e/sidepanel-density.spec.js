const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForActivitySettled } = require('./test-helpers');

// Run serially so we can share one fixture server/port.
test.describe.configure({ mode: 'serial' });

test.describe('Side panel density for MC/Cloze', () => {
  test.setTimeout(20000);

  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('saves density in side panel and applies to nouns MC/Cloze', async ({ page, browserContext, extensionId }, testInfo) => {
    // 1) Open nouns fixture
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;
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

    // Wait for enhancement to fully settle (MC spans rendered, processing done)
    await waitForActivitySettled(page, sidePanelPage, { spanSelector: '.ʁ-noun-mc', timeout: 12000 });
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
