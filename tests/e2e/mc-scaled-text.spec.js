// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
//
// Issue #66: on pages that shrink huge text with a CSS transform (Scribd),
// native <select> dropdowns ignore the transform and open giant. Before
// opening, an MC select must get its on-screen font size while keeping its
// on-screen size and position in the text.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForActivitySettled } = require('./test-helpers');

test.describe('MC selects in CSS-scaled text', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('select font matches on-screen text size before the dropdown opens', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/mc-scaled-text.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);
    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => document.querySelector('#activity-menu')?.options.length > 1);
    await sidePanelPage.selectOption('#activity-menu', 'mc');
    await sidePanelPage.waitForFunction(() => !document.getElementById('enhance-button')?.disabled);
    await sidePanelPage.click('#enhance-button');
    await waitForActivitySettled(page, sidePanelPage, { spanSelector: '.ʁ-noun-mc' });

    const select = page.locator('.ʁ-noun-mc select').first();
    await expect(select).toBeVisible({ timeout: 20000 });
    const measure = () => select.evaluate(el => {
      const r = el.getBoundingClientRect();
      const next = el.parentElement.nextSibling;
      const range = document.createRange();
      range.selectNodeContents(next);
      return { font: parseFloat(getComputedStyle(el).fontSize), x: r.x, width: r.width, nextX: range.getBoundingClientRect().x };
    });

    const before = await measure();
    expect(before.font).toBe(139);

    await select.dispatchEvent('mousedown');
    const after = await measure();
    // Native dropdowns use the select's own font size: it must be ~139 * 0.2.
    expect(after.font).toBeCloseTo(27.8, 0);
    // ...without visibly moving the select or the following text.
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.width).toBeCloseTo(before.width, 0);
    expect(after.nextX).toBeCloseTo(before.nextX, 0);
  });
});
