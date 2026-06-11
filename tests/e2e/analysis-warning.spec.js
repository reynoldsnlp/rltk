// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Analysis warning icon', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows warning icon when diagnostic flag is set', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;

    await page.goto(fixtureUrl);
    await page.evaluate(() => {
      document.documentElement.dataset.rltkTestAnalysisWarning = 'cg3';
      document.documentElement.dataset.rltkTestAnalysisWarningMessage = 'Diagnostic warning injected for tests.';
    });

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const warningButton = sidePanelPage.locator('#reading-tutor-analysis-warning');
    await expect(warningButton).toBeVisible({ timeout: 20000 });
  });
});
