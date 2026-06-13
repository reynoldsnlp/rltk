// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
//
// Verifies the Writing tutor works end-to-end. This is the only flow that uses
// the L2 analyser, which is loaded on demand (ensureL2Analyser) rather than with
// the primary model batch — so this test also guards that lazy-load path.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, openSidePanel } = require('./test-helpers');

test.describe('Writing Tutor (L2)', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('analyzes pasted text via the on-demand L2 model', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;
    await page.goto(fixtureUrl);
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);

    await sidePanelPage.click('.tab-button[data-tab="writing"]');
    await sidePanelPage.fill('#writing-input', 'Я читаю книгу.');
    await sidePanelPage.click('#writing-analyze-button');

    // Analysis must finish (this requires the L2 analyser to have loaded on demand).
    await expect(sidePanelPage.locator('#writing-container')).toBeVisible({ timeout: 40000 });
    await sidePanelPage.waitForFunction(() => {
      const r = document.getElementById('writing-results');
      return r && r.textContent.trim().length > 0;
    }, { timeout: 40000 });

    // The rendered tokens should reflect the input, and there must be no failure message.
    const results = sidePanelPage.locator('#writing-results');
    await expect(results).toContainText('книгу');
    await expect(results.locator('.error')).toHaveCount(0);
  });
});
