const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Roots Activities', () => {
  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

    browserContext = await launchPersistentContext(userDataDir, {
      extensionPath: pathToExtension,
    });

    const extension = await ensureExtensionReady(browserContext);
    extensionId = extension.extensionId;
  });

  test.afterAll(async () => {
    await browserContext?.close();
    serverInstance?.close();
  });

  test.beforeEach(async () => {
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanel(tabId) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await expect(sidePanelPage.locator('.tab-button.active[data-tab="reading-activities"]')).toBeVisible();

    return sidePanelPage;
  }

  test('roots highlight shows summary and tooltip', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/roots.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openSidePanel(tabId);

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

  test('roots multiple choice uses root definitions', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/roots-mc.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openSidePanel(tabId);

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
