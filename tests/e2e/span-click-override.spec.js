const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId } = require('./test-helpers');

test.describe('Span click override toggle', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('override prevents parent click handlers', async ({ page, browserContext, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/span-click-override.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    await serviceWorker.evaluate((id) => {
      return chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['rltk/content.js']
      });
    }, tabId);

    await serviceWorker.evaluate((id) => {
      return chrome.tabs.sendMessage(id, { action: 'set_span_click_override', enabled: true });
    }, tabId);

    await page.locator('.ʁ').first().click();
    const afterOverride = await page.evaluate(() => window.segmentClicks);
    expect(afterOverride).toBe(0);

    await serviceWorker.evaluate((id) => {
      return chrome.tabs.sendMessage(id, { action: 'set_span_click_override', enabled: false });
    }, tabId);

    await page.locator('.ʁ').first().click();
    const afterDisable = await page.evaluate(() => window.segmentClicks);
    expect(afterDisable).toBe(1);
  });
});
