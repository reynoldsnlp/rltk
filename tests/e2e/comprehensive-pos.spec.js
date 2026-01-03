const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const server = require('./server');

test.describe.configure({ mode: 'serial' });

test.describe('Comprehensive POS Paradigm Generation', () => {
  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
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

    // Wait for extension to load
    let serviceWorker = browserContext.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await browserContext.waitForEvent('serviceworker');
    }
    const swUrl = serviceWorker.url();
    extensionId = swUrl.split('/')[2];
  });

  test.afterAll(async () => {
    await browserContext.close();
    serverInstance.close();
  });

  test.beforeEach(async () => {
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

  async function openSidePanelAndActivateReadingTutor(tabId) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel.html?debugTabId=${tabId}`);

    // Click Reading Tutor tab
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    // Wait for processing to finish (enhance button text or loading indicator)
    // In reading tutor, it shows "Preparing text..." in #reading-tutor-results
    // Then clears it.
    await sidePanelPage.waitForFunction(() => {
        const container = document.getElementById('reading-tutor-results');
        return container && !container.textContent.includes('Preparing text...');
    });

    return sidePanelPage;
  }

  test('should generate paradigms for various parts of speech', async () => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);
    sidePanelPage.on('console', msg => console.log('SIDEPANEL LOG:', msg.text()));

    // Verify page loaded
    await expect(page.locator('h1')).toHaveText('Comprehensive POS Test Page');

    // Wait for enhancement on the page
    const wordLocator = page.locator('.ʁ-reading-tutor').first();
    await expect(wordLocator).toBeVisible({ timeout: 10000 });

    // List of IDs to test
    const testIds = [
        'pron-sebya', 'pron-svoy', 'pron-etot', 'pron-nash', 'pron-tvoy', 'pron-on', 'pron-my', 'pron-kakoy', 'pron-kakov',
        'prop-ivan', 'prop-moscow', 'prop-russia',
        'noun-table', 'noun-book', 'noun-window', 'noun-time', 'noun-way',
        'noun-god-voc', 'noun-floor-loc2',
        'adj-big', 'adj-blue', 'adj-good', 'adj-newer',
        'verb-do', 'verb-done', 'verb-go', 'verb-drive', 'verb-want', 'verb-give', 'verb-eat',
        'verb-doing-refl'
    ];

    for (const id of testIds) {
        console.log(`Testing word with ID: ${id}`);
        const element = page.locator(`#${id}`);

        // Debug: print HTML
        try {
            const html = await element.innerHTML();
            console.log(`HTML for #${id}: ${html}`);
        } catch (e) {
            console.log(`Could not get HTML for #${id}`);
        }

        const clickableSpan = element.locator('.ʁ-reading-tutor').first();
        await expect(clickableSpan).toBeVisible();

        await clickableSpan.click();

        // Check side panel for results
        // We expect .lemma-group to appear
        const lemmaGroup = sidePanelPage.locator('.lemma-group').first();
        await expect(lemmaGroup).toBeVisible({ timeout: 5000 });

        // Check if paradigm table can be expanded (if applicable)
        // Not all words have paradigms (e.g. maybe some pronouns if not implemented), but most should.
        // We can check if the "+" button exists.
        const toggleButton = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
        if (await toggleButton.isVisible()) {
            await toggleButton.click();
            // Check for table
            const table = sidePanelPage.locator('.paradigm-table').first();
            await expect(table).toBeVisible();

            // Check for "Oops! The clicked form was not found" warning
            const warning = sidePanelPage.locator('.warning:has-text("Oops!")');
            if (await warning.isVisible()) {
                console.log(`Warning found for #${id}. Table content:`);
                const tableContent = await sidePanelPage.locator('.paradigm-table').innerText();
                console.log(tableContent);
            }
            await expect(warning).not.toBeVisible();

            // Check for missing forms (indicated by em dash)
            const tables = sidePanelPage.locator('.paradigm-table tbody');
            const count = await tables.count();
            for (let i = 0; i < count; ++i) {
                const tableText = await tables.nth(i).innerText();
                if (tableText.includes('—')) {
                     console.log(`Missing form found for #${id} in table ${i}. Table content:`);
                     console.log(tableText);
                }

                // Skip strict check for 'verb-eat' and 'verb-doing-refl' as they are known to have missing participle forms or non-applicable forms
                if (id !== 'verb-eat' && id !== 'verb-doing-refl') {
                    expect(tableText).not.toContain('—');
                }
            }
        }
    }
  });
});
