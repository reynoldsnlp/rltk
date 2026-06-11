// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId } = require('./test-helpers');

test.describe('YouTube transcript interaction', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('RLTK spans do not trigger transcript segment click', async ({ page, browserContext, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/youtube-transcript.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    await serviceWorker.evaluate((id) => {
      return chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['rltk/content.js']
      });
    }, tabId);

    // Wait for the injected content script to enhance the transcript (.ʁ spans
    // appear) instead of guessing with a fixed delay.
    await page.locator('.ʁ').first().waitFor({ state: 'attached', timeout: 15000 });

    await page.locator('.ʁ').first().click();
    const afterSpanClick = await page.evaluate(() => ({
      segment: window.segmentClicks,
      span: window.spanClicks
    }));

    expect(afterSpanClick.span).toBe(1);
    expect(afterSpanClick.segment).toBe(0);

    await page.locator('#timestamp').click();
    const afterTimestampClick = await page.evaluate(() => ({
      segment: window.segmentClicks,
      span: window.spanClicks
    }));

    expect(afterTimestampClick.segment).toBe(1);
    expect(afterTimestampClick.span).toBe(1);
  });
});
