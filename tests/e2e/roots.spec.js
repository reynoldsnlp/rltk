const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, openSidePanel } = require('./test-helpers');

test.describe('Roots Activities', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openReadingActivitiesPanel(browserContext, extensionId, tabId) {
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await expect(sidePanelPage.locator('.tab-button.active[data-tab="reading-activities"]')).toBeVisible();

    return sidePanelPage;
  }

  test('roots highlight shows summary and tooltip', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/roots.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openReadingActivitiesPanel(browserContext, extensionId, tabId);

    await sidePanelPage.selectOption('#topic-menu', 'roots');
    await sidePanelPage.selectOption('#activity-menu', 'color');

    await sidePanelPage.click('#enhance-button');

    const rootSpan = page.locator('.rltk-root-fragment').first();
    await expect(rootSpan).toBeVisible({ timeout: 30000 });

    await rootSpan.hover();
    const tooltip = page.locator('.rltk-root-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('БРАТ');

    const summarySection = sidePanelPage.locator('#roots-summary-section');
    await expect(summarySection).toBeVisible();

    const firstRow = summarySection.locator('tbody tr').first();
    await expect(firstRow).toContainText('БРАТ');
    await expect(firstRow).toContainText('брат');
    await expect(firstRow).toContainText('братец');
  });

  test('roots multiple choice uses root definitions', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/roots-mc.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openReadingActivitiesPanel(browserContext, extensionId, tabId);

    await sidePanelPage.selectOption('#topic-menu', 'roots');
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    await sidePanelPage.evaluate(() => {
      const slider = document.getElementById('density-slider');
      if (slider) {
        slider.value = '0';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await sidePanelPage.click('#enhance-button');

    const mcContainer = page.locator('.ʁ-root-mc').first();
    await expect(mcContainer).toBeVisible({ timeout: 30000 });
    await expect(mcContainer).toContainText('Болт');

    const options = await mcContainer.locator('select option').allTextContents();
    const optionText = options.join(' | ');
    expect(optionText).toContain('stir up, chatter');
    expect(optionText).toContain('hurt, pain, ache');
  });
});
