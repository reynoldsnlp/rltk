// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
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

    await page.locator('#segment-span').click();
    await page.locator('#overlay-span').click();
    const afterOverride = await page.evaluate(() => ({
      segment: window.segmentClicks,
      overlay: window.overlayClicks,
      segmentSpan: window.segmentSpanClicks,
      overlaySpan: window.overlaySpanClicks
    }));
    expect(afterOverride.segment).toBe(0);
    expect(afterOverride.overlay).toBe(0);
    expect(afterOverride.segmentSpan).toBe(1);
    expect(afterOverride.overlaySpan).toBe(1);

    await serviceWorker.evaluate((id) => {
      return chrome.tabs.sendMessage(id, { action: 'set_span_click_override', enabled: false });
    }, tabId);

    await page.locator('#segment-span').click();
    await page.locator('#overlay-link').click();
    const afterDisable = await page.evaluate(() => ({
      segment: window.segmentClicks,
      overlay: window.overlayClicks,
      segmentSpan: window.segmentSpanClicks,
      overlaySpan: window.overlaySpanClicks
    }));
    expect(afterDisable.segment).toBe(1);
    expect(afterDisable.overlay).toBe(1);
    expect(afterDisable.segmentSpan).toBe(2);
    expect(afterDisable.overlaySpan).toBe(1);
  });
});
