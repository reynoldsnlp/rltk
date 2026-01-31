const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');

function createParadigmSuite(suiteLabel, testIds, options = {}) {
  const allowMissingIds = new Set(options.allowMissingIds || []);

  test.describe.configure({ mode: 'serial' });

  test.describe(`Paradigm Generation - ${suiteLabel}`, () => {
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

      const pathToExtension = path.resolve(__dirname, '../../src/');
      const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

      browserContext = await launchPersistentContext(userDataDir, {
        extensionPath: pathToExtension,
      });

      const extension = await ensureExtensionReady(browserContext);
      extensionId = extension.extensionId;
    });

    test.afterAll(async () => {
      await browserContext.close();
      serverInstance.close();
    });

    test.beforeEach(async () => {
      page = await browserContext.newPage();
    });

    test.afterEach(async () => {
      await closeNonKeepAlivePages(browserContext);
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
      await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

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

    async function runPosTest(ids) {
      const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
      await page.goto(fixtureUrl);

      const tabId = await getFixtureTabId(fixtureUrl);
      expect(tabId).not.toBeNull();

      const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

      // Verify page loaded
      await expect(page.locator('h1')).toHaveText('Comprehensive POS Test Page');

      // Wait for enhancement on the page
      const wordLocator = page.locator('.ʁ-reading-tutor').first();
      await expect(wordLocator).toBeVisible({ timeout: 10000 });

      for (const id of ids) {
        const element = page.locator(`#${id}`);

        const clickableSpan = element.locator('.ʁ-reading-tutor').first();
        await expect(clickableSpan).toBeVisible();

        await clickableSpan.click();

        // Check side panel for results
        const lemmaGroup = sidePanelPage.locator('.lemma-group').first();
        await expect(lemmaGroup).toBeVisible({ timeout: 5000 });

        // Check if paradigm table can be expanded (if applicable)
        const toggleButton = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
        if (await toggleButton.isVisible()) {
          await toggleButton.click();
          const table = sidePanelPage.locator('.paradigm-table').first();
          await expect(table).toBeVisible();

          const warning = sidePanelPage.locator('.warning:has-text("Oops!")');
          await expect(warning).not.toBeVisible();

          const tables = sidePanelPage.locator('.paradigm-table tbody');
          const count = await tables.count();
          for (let i = 0; i < count; ++i) {
            const tableText = await tables.nth(i).innerText();
            if (!allowMissingIds.has(id)) {
              expect(tableText).not.toContain('—');
            }
          }
        }
      }
    }

    test(`${suiteLabel.toLowerCase()} paradigms`, async () => {
      await runPosTest(testIds);
    });
  });
}

module.exports = {
  createParadigmSuite,
};
