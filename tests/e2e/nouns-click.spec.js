// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, openSidePanel, waitForActivitySettled } = require('./test-helpers');


test.describe('Nouns Click Activity', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanelForActivity(browserContext, extensionId, tabId, topicValue, activityValue) {
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', topicValue);
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', activityValue);
    await sidePanelPage.waitForFunction(() => {
      const btn = document.getElementById('enhance-button');
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    await sidePanelPage.click('#enhance-button');
    return sidePanelPage;
  }

  test('nouns click activity highlights on click', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns-click.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanelForActivity(browserContext, extensionId, tabId, 'nouns', 'click');

    // Wait for enhancement to fully settle before interacting.
    await waitForActivitySettled(page, sidePanelPage, { spanSelector: 'span.ʁ-click-green' });
    const nounLocator = page.locator('span.ʁ-click-green').first();
    await expect(nounLocator).toBeVisible({ timeout: 20000 });

    // Click the noun
    await nounLocator.evaluate(node => node.click());

    // Check if class 'clicked' is added
    await expect(nounLocator).toHaveClass(/clicked/);

    // Visual style can vary across environments; class assertion above is sufficient.

    // Verify we didn't navigate
    expect(page.url()).toContain('nouns-click.html');
  });
});
