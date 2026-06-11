// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForReadingTutorSettled } = require('./test-helpers');


test.describe('Token selector respects layout heuristics and selection override', () => {
  test.setTimeout(20000);

  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('skips header/footer/nav unless user selection overrides', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/selection-targeting.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    // Dense selection to ensure coverage
    await sidePanelPage.$eval('#density-slider', (el) => {
      el.value = '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await sidePanelPage.click('#enhance-button');

    // Wait for enhancement to finish
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-noun-mc').length > 0, { timeout: 8000 });

    const headerCount = await page.locator('header .ʁ-noun-mc').count();
    const navCount = await page.locator('nav .ʁ-noun-mc').count();
    const footerCount = await page.locator('footer .ʁ-noun-mc').count();
    const mainCount = await page.locator('main .ʁ-noun-mc').count();

    expect(headerCount).toBe(0);
    expect(navCount).toBe(0);
    expect(footerCount).toBe(0);
    expect(mainCount).toBeGreaterThan(0);

    // Restore to clear previous spans
    await sidePanelPage.click('#restore-button');
    await page.waitForFunction(() => document.querySelectorAll('.ʁ').length === 0, { timeout: 8000 });

    // Select only the header content
    await page.$eval('header', (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Wait for side panel to reflect selection state
    await expect(sidePanelPage.locator('#enhance-button')).toHaveText('Enhance selected text');

    await sidePanelPage.click('#enhance-button');

    await page.waitForFunction(() => document.querySelectorAll('header .ʁ-noun-mc').length > 0, { timeout: 8000 });

    const headerCountAfter = await page.locator('header .ʁ-noun-mc').count();
    const navCountAfter = await page.locator('nav .ʁ-noun-mc').count();
    const footerCountAfter = await page.locator('footer .ʁ-noun-mc').count();
    const mainCountAfter = await page.locator('main .ʁ-noun-mc').count();

    expect(headerCountAfter).toBeGreaterThan(0);
    expect(navCountAfter).toBe(0);
    expect(footerCountAfter).toBe(0);
    expect(mainCountAfter).toBe(0);
  });

  test('falls back outside main/article when main/article yields almost nothing', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/selection-targeting-fallback.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'nouns');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', 'mc');

    // Dense selection to ensure coverage
    await sidePanelPage.$eval('#density-slider', (el) => {
      el.value = '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await sidePanelPage.click('#enhance-button');

    // The fallback should allow highlighting in #post-content despite <main> existing.
    await page.waitForFunction(() => document.querySelectorAll('#post-content .ʁ-noun-mc').length > 0, { timeout: 8000 });

    const headerCount = await page.locator('header .ʁ-noun-mc').count();
    const navCount = await page.locator('nav .ʁ-noun-mc').count();
    const footerCount = await page.locator('footer .ʁ-noun-mc').count();
    const postCount = await page.locator('#post-content .ʁ-noun-mc').count();

    expect(headerCount).toBe(0);
    expect(navCount).toBe(0);
    expect(footerCount).toBe(0);
    expect(postCount).toBeGreaterThan(0);
  });

  // Reading Tutor intentionally processes the ENTIRE page (including header/nav/footer)
  // so users can click on any word to see translations and grammar tables.
  // This is different from Reading Activities which focus on main content.
  test('reading tutor annotates across the full page when main/article is insufficient', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/selection-targeting-fallback.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    // Wait for the reading tutor to finish analyzing the whole page before
    // counting spans per region, instead of a fixed delay.
    await waitForReadingTutorSettled(page, sidePanelPage);

    await page.waitForFunction(() => document.querySelectorAll('#post-content .ʁ-reading-tutor').length > 0, { timeout: 8000 });

    const headerCount = await page.locator('header .ʁ-reading-tutor').count();
    const navCount = await page.locator('nav .ʁ-reading-tutor').count();
    const footerCount = await page.locator('footer .ʁ-reading-tutor').count();
    const postCount = await page.locator('#post-content .ʁ-reading-tutor').count();

    expect(headerCount).toBeGreaterThan(0);
    expect(navCount).toBeGreaterThan(0);
    expect(footerCount).toBeGreaterThan(0);
    expect(postCount).toBeGreaterThan(0);
  });
});
