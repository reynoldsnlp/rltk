const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext } = require('./launch-context');

// Run serially so we can share the fixture server.
test.describe.configure({ mode: 'serial' });

test.describe('Token selector respects layout heuristics and selection override', () => {
  test.setTimeout(20000);

  let browserContext;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = `/tmp/test-user-data-dir-${Math.random()}`;

    browserContext = await launchPersistentContext(userDataDir, {
      extensionPath: pathToExtension,
    });

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const swUrl = serviceWorker.url();
    extensionId = swUrl.split('/')[2];
  });

  test.afterAll(async () => {
    await browserContext.close();
    serverInstance.close();
  });

  test.beforeEach(async () => {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));

    for (const p of browserContext.pages()) {
      await p.close();
    }
  });

  test.afterEach(async () => {
    for (const p of browserContext.pages()) {
      await p.close();
    }
  });

  async function getFixtureTabId(fixtureUrl) {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await serviceWorker.evaluate(async (targetUrl) => {
      const exact = await chrome.tabs.query({ url: targetUrl });
      if (exact.length > 0) return exact[0].id;
      const all = await chrome.tabs.query({});
      return all.length > 0 ? all[0].id : null;
    }, fixtureUrl);
    return tabId;
  }

  test('skips header/footer/nav unless user selection overrides', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/selection-targeting.html`;
    const page = await browserContext.newPage();
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

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

  test('falls back outside main/article when main/article yields almost nothing', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/selection-targeting-fallback.html`;
    const page = await browserContext.newPage();
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

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

  test('reading tutor annotates outside main/article while still skipping header/nav/footer', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/selection-targeting-fallback.html`;
    const page = await browserContext.newPage();
    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    await page.waitForFunction(() => document.querySelectorAll('#post-content .ʁ-reading-tutor').length > 0, { timeout: 8000 });

    const headerCount = await page.locator('header .ʁ-reading-tutor').count();
    const navCount = await page.locator('nav .ʁ-reading-tutor').count();
    const footerCount = await page.locator('footer .ʁ-reading-tutor').count();
    const postCount = await page.locator('#post-content .ʁ-reading-tutor').count();

    expect(headerCount).toBe(0);
    expect(navCount).toBe(0);
    expect(footerCount).toBe(0);
    expect(postCount).toBeGreaterThan(0);
  });
});
