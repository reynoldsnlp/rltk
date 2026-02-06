const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

function createParadigmSuite(suiteLabel, testIds, options = {}) {
  const allowMissingIds = new Set(options.allowMissingIds || []);
  const skipParadigmExpansion = options.skipParadigmExpansion || false;
  const warmupId = options.warmupId || null;

  test.describe.configure({ mode: 'serial' });

  test.describe(`Paradigm Generation - ${suiteLabel}`, () => {
    test.setTimeout(options.timeout ?? 90000);

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
      if (browserContext) {
        try {
          await browserContext.close();
        } catch (e) {
          // Context may already be closed
        }
      }
      if (serverInstance) {
        serverInstance.close();
      }
      // Small delay to allow cleanup between test suites
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test.beforeEach(async () => {
      page = await browserContext.newPage();
    });

    test.afterEach(async () => {
      await closeNonKeepAlivePages(browserContext);
    });

    async function openSidePanelAndActivateReadingTutor(tabId) {
      const sidePanelPage = await browserContext.newPage();
      await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
      await waitForSidePanelReady(sidePanelPage);

      // Click Reading Tutor tab
      await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');
      await expect(sidePanelPage.locator('.tab-button.active[data-tab="reading-tutor"]')).toBeVisible();

      // Ensure we are on the translations-and-tables subtab
      await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
      await expect(sidePanelPage.locator('.sub-tab-button.active[data-subtab="translations-and-tables"]')).toBeVisible();

      const accessModal = sidePanelPage.locator('#access-modal');
      await expect(accessModal).toBeHidden();

      // Wait for processing to finish (enhance button text or loading indicator)
      // In reading tutor, it shows "Preparing text..." in #reading-tutor-results
      // Then clears it.
        await sidePanelPage.waitForFunction(() => {
          const container = document.getElementById('reading-tutor-results');
          return container && !container.textContent.includes('Preparing text...');
        }, { timeout: 45000 });

      return sidePanelPage;
    }

    async function runPosTest(ids) {
      const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
      await page.goto(fixtureUrl);

      const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');

      const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
      expect(tabId).not.toBeNull();

      const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

      // Verify page loaded
      await expect(page.locator('h1')).toHaveText('Comprehensive POS Test Page');

      // Wait for enhancement on the page
      const wordLocator = page.locator('.ʁ-reading-tutor').first();
      await expect(wordLocator).toBeVisible({ timeout: 10000 });
      await expect(wordLocator).toHaveAttribute('data-readings', /.+/);

      async function clickAndWaitForSelection(span, id) {
        await span.scrollIntoViewIfNeeded();
        await span.evaluate((el) => el.click());

        let selectionArrived = true;
        try {
          await expect.poll(async () => {
            const lemmaCount = await sidePanelPage.locator('.lemma-group').count();
            if (lemmaCount > 0) return true;
            const container = sidePanelPage.locator('#reading-tutor-results');
            const text = await container.innerText().catch(() => '');
            return text.includes('Analyzing...');
          }, { timeout: 20000 }).toBe(true);
        } catch (error) {
          selectionArrived = false;
        }

        if (!selectionArrived && id) {
          const payload = await page.evaluate((targetId) => {
            const target = document.querySelector(`#${targetId} .ʁ-reading-tutor`);
            if (!target) return null;
            const readings = JSON.parse(target.getAttribute('data-readings') || '[]');
            const text = target.textContent || '';
            return {
              action: 'reading_tutor_selection',
              text,
              cohort: { w: text, rs: readings },
              index: 0
            };
          }, id);

          if (payload) {
            await serviceWorker.evaluate((message) => chrome.runtime.sendMessage(message), payload);
            await expect(sidePanelPage.locator('.lemma-group').first()).toBeVisible({ timeout: 20000 });
          }
        }
      }

      if (warmupId) {
        const warmupElement = page.locator(`#${warmupId}`);
        const warmupSpan = warmupElement.locator('.ʁ-reading-tutor').first();
        await expect(warmupSpan).toBeVisible();
        await clickAndWaitForSelection(warmupSpan, warmupId);

        const warmupLemmaGroup = sidePanelPage.locator('.lemma-group').first();
        await expect(warmupLemmaGroup).toBeVisible({ timeout: 20000 });

        const warmupToggle = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
        if (await warmupToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
          await warmupToggle.click();
          const warmupTable = sidePanelPage.locator('.paradigm-table').first();
          await expect(warmupTable).toBeVisible({ timeout: 90000 });
        }
      }

      for (const id of ids) {
        const element = page.locator(`#${id}`);

        const clickableSpan = element.locator('.ʁ-reading-tutor').first();
        await expect(clickableSpan).toBeVisible();

        await clickAndWaitForSelection(clickableSpan, id);

        // Check side panel for results
        const lemmaGroup = sidePanelPage.locator('.lemma-group').first();
        await expect(lemmaGroup).toBeVisible({ timeout: 60000 });

        // Check if paradigm table can be expanded (if applicable)
        if (!skipParadigmExpansion) {
          const toggleButton = sidePanelPage.locator('.lemma-group button').filter({ hasText: '+' }).first();
          if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await toggleButton.click();
            const table = sidePanelPage.locator('.paradigm-table').first();
            await expect(table).toBeVisible({ timeout: 90000 });

            const warning = sidePanelPage.locator('.warning:has-text("Oops!")');
            await expect(warning).not.toBeVisible();

            const tables = sidePanelPage.locator('.paradigm-table tbody');
            const count = await tables.count();
            for (let i = 0; i < count; ++i) {
              const tableText = await tables.nth(i).innerText();
              if (!allowMissingIds.has(id)) {
                expect(tableText).not.toContain('—');

                // Verify table cells contain actual Cyrillic text (Russian word forms)
                const cyrillicPattern = /[\u0400-\u04FF]/;
                expect(cyrillicPattern.test(tableText)).toBe(true);
              }
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
