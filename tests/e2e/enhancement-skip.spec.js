const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForActivitySettled } = require('./test-helpers');

// Run serially so we can share one fixture server/port.
test.describe.configure({ mode: 'serial' });

test.describe('Enhancement reuse avoids reprocessing', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('re-clicking enhance keeps existing spans', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;

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
    await waitForActivitySettled(page, sidePanelPage, { spanSelector: '.ʁ-noun-mc', timeout: 12000 });

    const firstSpanHandle = await page.$('.ʁ-noun-mc');
    expect(firstSpanHandle).not.toBeNull();

    const isConnectedBefore = await firstSpanHandle.evaluate(el => el.isConnected);
    expect(isConnectedBefore).toBe(true);

    // Click enhance again - should skip and keep existing spans.
    await sidePanelPage.click('#enhance-button');
    // Flush with an awaited content-script round-trip instead of a fixed delay,
    // and confirm the page is still enhanced (a reprocess would tear spans down).
    const status = await sidePanelPage.evaluate((id) => new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_status', tabId: id }, resolve);
    }), tabId);
    expect(status?.data?.isEnhanced ?? status?.isEnhanced).toBe(true);

    const isConnectedAfter = await firstSpanHandle.evaluate(el => el.isConnected);
    expect(isConnectedAfter).toBe(true);
  });
});
