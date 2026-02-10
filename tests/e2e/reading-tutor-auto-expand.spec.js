const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Reading Tutor auto expansion', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('auto-expands when single lemma group returned', async ({ page, browserContext, extensionId }, testInfo) => {
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

    await expect(sidePanelPage.locator('.lemma-group')).toHaveCount(1, { timeout: 20000 });

    const table = sidePanelPage.locator('.paradigm-table').first();
    await expect(table).toBeVisible({ timeout: 90000 });

    const toggle = sidePanelPage.locator('.lemma-group button').first();
    await expect(toggle).toHaveText('-', { timeout: 5000 });
  });
});
