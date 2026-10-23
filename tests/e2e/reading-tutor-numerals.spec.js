// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
//
// Arabic numerals (e.g. "1812") have no translation or paradigm, so the
// Reading Tutor wraps them (keeping their readings) but doesn't make them
// clickable; neighboring words still are.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Reading Tutor Arabic numerals', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('digit-only tokens keep readings but are not clickable', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-numerals.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
    await waitForReadingTutorSettled(page, sidePanelPage);

    // Match on the stored original text; visible text may be stress-marked.
    const spanFor = (text) => page.locator(`.ʁ-reading-tutor[data-original-text="${text}"]`);
    const numeral = spanFor('1812');
    await expect(numeral).toHaveCount(1);
    expect(JSON.parse(await numeral.getAttribute('data-readings')).length).toBeGreaterThan(0);

    await numeral.hover();
    expect(await numeral.evaluate(el => getComputedStyle(el).cursor)).toBe('auto');
    expect(await numeral.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');

    await numeral.click();
    await expect(numeral).not.toHaveClass(/ʁ-highlighted/);
    await expect(sidePanelPage.locator('#reading-tutor-results .lemma-group')).toHaveCount(0);

    // An ordinary word is still clickable.
    await spanFor('году').hover();
    expect(await spanFor('году').evaluate(el => getComputedStyle(el).cursor)).toBe('pointer');
    await spanFor('году').click();
    await expect(spanFor('году')).toHaveClass(/ʁ-highlighted/);
    await expect(sidePanelPage.locator('#reading-tutor-results .lemma-group')).not.toHaveCount(0, { timeout: 20000 });
  });
});
