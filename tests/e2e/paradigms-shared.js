const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

function createParadigmSuite(suiteLabel, testIds, options = {}) {
  const allowMissingIds = new Set(options.allowMissingIds || []);
  const skipParadigmExpansion = options.skipParadigmExpansion || false;
  const warmupId = options.warmupId || null;

  test.describe.configure({ mode: 'serial' });

  test.describe(`Paradigm Generation - ${suiteLabel}`, () => {
    test.setTimeout(options.timeout ?? 90000);

    test.afterEach(async ({ browserContext }) => {
      await closeNonKeepAlivePages(browserContext);
    });

    async function openSidePanelAndActivateReadingTutor({ browserContext, extensionId, tabId }) {
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

    async function runPosTest({ ids, page, browserContext, extensionId, serviceWorker, baseURL }) {
      const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
      await page.goto(fixtureUrl);

      const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
      expect(tabId).not.toBeNull();

      const sidePanelPage = await openSidePanelAndActivateReadingTutor({ browserContext, extensionId, tabId });

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
          // A selection normally renders in well under a second. Keep this short
          // so a click that produced no selection (e.g. one that toggled an
          // already-selected word back off) falls through to the deterministic
          // service-worker re-send below quickly instead of stalling ~20s.
          await expect.poll(async () => {
            const lemmaCount = await sidePanelPage.locator('.lemma-group').count();
            if (lemmaCount > 0) return true;
            const container = sidePanelPage.locator('#reading-tutor-results');
            const text = await container.innerText().catch(() => '');
            return text.includes('Analyzing...');
          }, { timeout: 5000 }).toBe(true);
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

      // Warm up generation before the asserted loop — but never with a word the
      // loop itself will click. Clicking a reading-tutor word toggles its
      // selection, so warming up with an id that is also in `ids` makes that id's
      // first loop click DEselect the word, leaving the test to stall on the
      // selection wait before recovering via the fallback.
      if (warmupId && !ids.includes(warmupId)) {
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

    test(`${suiteLabel.toLowerCase()} paradigms`, async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      await runPosTest({
        ids: testIds,
        page,
        browserContext,
        extensionId,
        serviceWorker,
        baseURL
      });
    });
  });
}

module.exports = {
  createParadigmSuite,
};
