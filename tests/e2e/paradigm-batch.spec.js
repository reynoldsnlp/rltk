const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Paradigm generation during batch processing', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test.skip('generates paradigms and resumes batch processing', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    await page.evaluate(() => {
      document.documentElement.dataset.rltkTestSlowEnhance = '1500';
      const target = document.getElementById('target');
      if (!target) return;
      target.textContent = 'книга '.repeat(6000);
    });

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    const progressLabel = sidePanelPage.locator('#reading-tutor-batch-progress');
    await expect(progressLabel).toBeVisible({ timeout: 20000 });
    const initialProgress = await progressLabel.innerText();

    const firstWord = page.locator('.ʁ-reading-tutor').first();
    await expect(firstWord).toBeVisible({ timeout: 20000 });
    await firstWord.click();

    const toggleButton = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
    await expect(toggleButton).toBeVisible({ timeout: 20000 });
    await toggleButton.click();

    const table = sidePanelPage.locator('.paradigm-table').first();
    await expect(table).toBeVisible({ timeout: 90000 });

    await expect.poll(async () => {
      const text = await progressLabel.innerText();
      return text !== initialProgress && text.trim().length > 0;
    }, { timeout: 30000 }).toBe(true);
  });
});
