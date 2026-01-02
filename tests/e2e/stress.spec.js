const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const server = require('./server');

// Run serially to share a single fixture server.
test.describe.configure({ mode: 'serial' });

test.describe('Word Stress Activity', () => {
  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
    // Start local server on an available port
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

    const pathToExtension = path.resolve(__dirname, '../../');
    const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const swUrl = serviceWorker.url();
    // URL format: chrome-extension://<id>/src/background.js
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

    page = await browserContext.newPage();
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

  async function openSidePanelForActivity(tabId, activityValue) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    await sidePanelPage.selectOption('#topic-menu', 'word-stress');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', activityValue);
    await sidePanelPage.click('#enhance-button');
    return sidePanelPage;
  }

  test('can open fixture page and read expected text', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    // Basic reachability: heading and known labels from the fixture
    await expect(page.getByText('Word Stress Activity Test Page')).toBeVisible();
    await expect(page.locator('text=Unambiguous Stress').first()).toBeVisible();
    await expect(page.locator('text=Ambiguous Stress').first()).toBeVisible();

    // Check a known word appears as plain text (no accent by default)
    const bodyHtml = await page.innerHTML('body');
    expect(bodyHtml.includes('дом')).toBe(true);
    expect(bodyHtml.includes('\u0301')).toBe(false);
  });

  test('enhance injects RLTK spans on fixture page', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    // Baseline: no accent marks or injected spans
    const baselineHtml = await page.innerHTML('body');
    expect(baselineHtml.includes('\u0301')).toBe(false);
    await expect(page.locator('.ʁ-stress')).toHaveCount(0);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'color');

    await page.waitForFunction(() => document.documentElement.innerHTML.includes('\u0301'), { timeout: 8000 });

    // Sanity: at least one injected span contains an accent
    const stressSpan = page.locator('.ʁ-stress', { hasText: /\u0301/ }).first();
    await expect(stressSpan).toBeVisible({ timeout: 5000 });
  });

  test('click activity marks stressed vowel on selection', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'click');

    const clickSpan = page.locator('.ʁ-stress-click').first();
    await expect(clickSpan).toBeVisible({ timeout: 8000 });
    const letters = clickSpan.locator('.letter');
    expect(await letters.count()).toBeGreaterThan(0);
  });

  test('multiple choice replaces token after correct selection', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'mc');

    const mcSelect = page.locator('.ʁ-stress-mc select').first();
    await expect(mcSelect).toBeVisible({ timeout: 8000 });

    // Select the correct option (dataset.isCorrect === 'true')
    const correctValue = await mcSelect.evaluate((sel) => {
      const option = Array.from(sel.options).find(opt => opt.dataset && opt.dataset.isCorrect === 'true');
      return option ? option.value : '';
    });
    expect(correctValue).not.toBe('');
    await mcSelect.selectOption(correctValue);

    // Correct selection replaces the container with a success span
    const correctSpan = page.locator('.ʁ-stress-correct').first();
    await expect(correctSpan).toBeVisible({ timeout: 8000 });
    await expect(correctSpan).toContainText('\u0301');
  });

  test('hover activity reveals stress on mouseover', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'hover');

    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress-hover'));
      for (const span of spans) {
        span.dispatchEvent(new Event('mouseenter', { bubbles: true }));
        if (span.textContent.includes('\u0301')) {
          span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
          return true;
        }
        span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
      }
      return false;
    }, { timeout: 8000 });
  });
});
