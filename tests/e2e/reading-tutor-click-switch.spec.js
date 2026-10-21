// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openFixture, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Reading Tutor token click', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('switches to Translations and tables from any other sub-tab', async ({ page, browserContext, extensionId }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'comprehensive-pos.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);

    const translationsButton = sidePanelPage.locator('.sub-tab-button[data-subtab="translations-and-tables"]');
    // Match on English glosses: the Russian forms are shown with stress marks.
    const results = sidePanelPage.locator('#reading-tutor-results');
    const book = page.locator('#noun-book .ʁ-reading-tutor').first();
    const big = page.locator('#adj-big .ʁ-reading-tutor').first();

    // From Vocabulary (the default sub-tab).
    await expect(sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]')).toHaveClass(/active/);
    await book.click();
    await expect(translationsButton).toHaveClass(/active/);
    await expect(sidePanelPage.locator('#translations-and-tables-subtab')).toBeVisible();
    await expect(results).toContainText('book, volume', { timeout: 20000 });

    // From Grammar highlighter: the new word is shown and highlighted, not the
    // previously selected one restored over it.
    await sidePanelPage.click('.sub-tab-button[data-subtab="grammar-highlighter"]');
    await big.click();
    await expect(translationsButton).toHaveClass(/active/);
    await expect(results).toContainText('big, large', { timeout: 20000 });
    await expect(results).not.toContainText('book, volume');
    await expect(big).toHaveClass(/ʁ-highlighted/);
    await expect(book).not.toHaveClass(/ʁ-highlighted/);
  });
});
