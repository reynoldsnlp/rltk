// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openFixture, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Reading Tutor results width', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('a paradigm table wider than the panel scrolls inside its card, not the whole panel', async ({ page, browserContext, extensionId }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'comprehensive-pos.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    // Narrow panel: the adjective table (Masc/Neut/Fem/Plural) can't shrink to fit.
    await sidePanelPage.setViewportSize({ width: 320, height: 800 });
    await waitForReadingTutorSettled(page, sidePanelPage);
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
    await page.locator('#adj-big .ʁ-reading-tutor').first().click();
    await expect(sidePanelPage.locator('.paradigm-table').first()).toBeVisible({ timeout: 90000 });

    const widths = await sidePanelPage.evaluate(() => {
      const right = el => el.getBoundingClientRect().right;
      const container = document.getElementById('reading-tutor-results');
      const main = document.querySelector('.sidepanel-main');
      return {
        card: right(container.querySelector('.word-analysis')),
        table: Math.max(...[...container.querySelectorAll('.paradigm-table')].map(right)),
        viewport: document.documentElement.clientWidth,
        resultsScrolls: container.scrollWidth > container.clientWidth,
        panelScrolls: main.scrollWidth > main.clientWidth
      };
    });
    expect(widths.table).toBeGreaterThan(widths.viewport); // the scenario under test
    expect(widths.card).toBeGreaterThanOrEqual(widths.table); // card wraps its table
    expect(widths.resultsScrolls).toBe(true);  // the results scroll sideways...
    expect(widths.panelScrolls).toBe(false);   // ...while the header/tabs stay put
  });
});
