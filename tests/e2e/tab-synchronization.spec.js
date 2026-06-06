const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForReadingTutorSettled, waitForActivitySettled } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Tab Synchronization and State Restoration', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('Reading Tutor sub-tabs restore state correctly', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await browserContext.newPage();

    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    // 1. Initial State: Reading Tutor active, Translations sub-tab active
    await expect(sidePanelPage.locator('.tab-button[data-tab="reading-tutor"]')).toHaveClass(/active/);
    await expect(sidePanelPage.locator('.sub-tab-button[data-subtab="translations-and-tables"]')).toHaveClass(/active/);

    // Wait for the reading tutor to finish analyzing before interacting.
    await waitForReadingTutorSettled(page, sidePanelPage);

    // 2. Select a word — click the first word
    await page.evaluate(() => {
        const el = document.querySelector('.ʁ-reading-tutor');
        if (el) el.click();
    });

    // Verify highlighted on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // Verify analysis in side panel
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
    await expect(sidePanelPage.locator('#reading-tutor-results')).toContainText('MC');

    // 3. Switch to Grammar Highlighter
    await sidePanelPage.click('.sub-tab-button[data-subtab="grammar-highlighter"]');

    // Verify word deselected on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).not.toHaveClass(/ʁ-highlighted/);

    // Verify side panel shows filters
    await expect(sidePanelPage.locator('#grammar-highlighter-filters')).toBeVisible();

    // 4. Switch back to Translations
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');

    // Verify word re-highlighted on page
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // Verify analysis restored in side panel
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
  });

  test('Switching between main tabs restores state', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/nouns.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    // 1. Start in Reading Tutor, select a word
    await waitForReadingTutorSettled(page, sidePanelPage);
    await page.evaluate(() => {
        const el = document.querySelector('.ʁ-reading-tutor');
        if (el) el.click();
    });
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);

    // 2. Switch to Reading Activities
    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');

    // Verify page restored (no Reading Tutor spans)
    // Note: restorePage removes the .ʁ-reading-tutor class or the spans entirely?
    // Based on implementation, it likely removes the spans or classes.
    // Let's check if the element still has the class.
    await expect(page.locator('.ʁ-reading-tutor')).toHaveCount(0);

    // 3. Enhance in Reading Activities
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.selectOption('#activity-menu', 'color');
    await sidePanelPage.click('#enhance-button');

    // Verify Nouns enhancement settled
    await waitForActivitySettled(page, sidePanelPage, { spanSelector: '.ʁ-noun' });
    await expect(page.locator('.ʁ-noun').first()).toBeVisible();

    // 4. Switch back to Reading Tutor
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    // Verify Nouns enhancement removed
    await expect(page.locator('.ʁ-nouns')).toHaveCount(0);

    // Verify Reading Tutor restored
    await waitForReadingTutorSettled(page, sidePanelPage);

    // Verify previous selection restored
    await expect(page.locator('.ʁ-reading-tutor >> nth=0')).toHaveClass(/ʁ-highlighted/);
    await expect(sidePanelPage.locator('#reading-tutor-results')).not.toBeEmpty();
  });
});
