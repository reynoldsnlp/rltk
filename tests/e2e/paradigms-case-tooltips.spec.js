const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Paradigm case tooltips', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('case labels expose tooltip content', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');

    const target = page.locator('#noun-book .ʁ-reading-tutor').first();
    await expect(target).toBeVisible({ timeout: 10000 });
    await target.click();

    const toggleButton = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggleButton.click();
    }

    const caseLabel = sidePanelPage.locator('.paradigm-table .case-tooltip').first();
    await expect(caseLabel).toBeVisible({ timeout: 20000 });
    await caseLabel.hover();

    const tooltip = caseLabel.locator('.case-tooltip-content');
    await expect(tooltip).toBeVisible({ timeout: 10000 });
    await expect(tooltip).toContainText('Case');
  });
});
