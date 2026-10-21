// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openFixture, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

// Click via the DOM, not Playwright: Playwright scrolls the target into view
// first, and that scroll would refresh the indicators and mask a missing update.
const clickTab = (panel, selector) => panel.evaluate(sel => document.querySelector(sel).click(), selector);
const nextFrame = (panel) => panel.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

test.describe('Reading Tutor off-screen match indicator', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('hides and reappears with its tab/sub-tab, without needing a scroll', async ({ page, browserContext, extensionId }, testInfo) => {
    const { tabId } = await openFixture(page, browserContext, testInfo, 'comprehensive-pos.html');
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await waitForReadingTutorSettled(page, sidePanelPage);
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
    await page.locator('#noun-book .ʁ-reading-tutor').first().click();
    await expect(sidePanelPage.locator('.rltk-paradigm-match').first()).toBeAttached({ timeout: 90000 });

    // Indicator parts are shown only while they carry a direction class.
    const shown = sidePanelPage.locator('.rltk-match-hint-chevron[class*="rltk-dir-"]');

    // Scroll the form off the top of the panel's scroll container (padding
    // guarantees room). Retried because the panel briefly re-scrolls the analysis
    // to the top while the paradigm finishes rendering.
    await expect(async () => {
      await sidePanelPage.evaluate(() => {
        const n = document.querySelector('.sidepanel-main');
        n.style.paddingBottom = '2000px';
        n.scrollTop = 1e6;
      });
      await expect(shown.first()).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 10000 });

    // Leaving the sub-tab hides the indicator immediately...
    await clickTab(sidePanelPage, '.sub-tab-button[data-subtab="vocabulary"]');
    await expect(shown).toHaveCount(0);
    // ...and a later scroll elsewhere in the panel doesn't resurrect it in a corner.
    await sidePanelPage.evaluate(() => document.dispatchEvent(new Event('scroll')));
    await nextFrame(sidePanelPage);
    await expect(shown).toHaveCount(0);

    // Coming back shows it again right away. A panel shorter than the analysis
    // header keeps the form below the fold even after the restore scrolls the
    // analysis to the top.
    await sidePanelPage.setViewportSize({ width: 400, height: 60 });
    await clickTab(sidePanelPage, '.sub-tab-button[data-subtab="translations-and-tables"]');
    await expect(shown.first()).toBeVisible();

    await clickTab(sidePanelPage, '.tab-button[data-tab="reading-activities"]');
    await expect(shown).toHaveCount(0);
  });
});
