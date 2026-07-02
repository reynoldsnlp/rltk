// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
//
// Clicking an out-of-vocabulary token — a word the analyzer had no dictionary
// entry for, which comes back with a single "unknown" reading tagged "?" (or no
// readings at all) — must show an explanatory placeholder in the analysis panel
// instead of a bogus "?"-tagged lemma group. An ordinary word still gets its
// normal lemma-group analysis.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, openSidePanel, waitForReadingTutorSettled } = require('./test-helpers');

test.describe('Reading Tutor out-of-vocabulary tokens', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openTutor(page, browserContext, extensionId, testInfo) {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-oov.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId);
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');
    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
    await waitForReadingTutorSettled(page, sidePanelPage);
    return sidePanelPage;
  }

  test('clicking an OOV token shows the "not found" placeholder', async ({ page, browserContext, extensionId }, testInfo) => {
    const sidePanelPage = await openTutor(page, browserContext, extensionId, testInfo);

    // Find the span the real analyzer marked as unknown (a lone "?" tag, or no
    // readings) — proves the fixture word is genuinely OOV rather than hard-coding
    // that assumption.
    const oovText = await page.evaluate(() => {
      const isUnknown = (readings) => {
        if (!Array.isArray(readings) || readings.length === 0) return true;
        return readings.every(r => {
          const tags = (r.ts || []).filter(t => !t.startsWith('<W:'));
          return tags.length === 1 && tags[0] === '?';
        });
      };
      const span = Array.from(document.querySelectorAll('.ʁ-reading-tutor')).find(s => {
        try { return isUnknown(JSON.parse(s.getAttribute('data-readings') || '[]')); }
        catch { return false; }
      });
      if (!span) return null;
      span.id = 'oov-token';
      return span.dataset.originalText || span.textContent;
    });
    expect(oovText, 'fixture must contain an out-of-vocabulary token').toBeTruthy();

    await page.locator('#oov-token').click();

    const results = sidePanelPage.locator('#reading-tutor-results');
    await expect(results.locator('.lemma-group')).toContainText('not found in dictionary', { timeout: 20000 });
    await expect(results.locator('.lemma-group')).toContainText(oovText);
    // The placeholder replaces analysis — no expandable paradigm should appear.
    await expect(results.locator('.paradigm-table')).toHaveCount(0);
  });

  test('clicking an in-vocabulary token still shows normal analysis', async ({ page, browserContext, extensionId }, testInfo) => {
    const sidePanelPage = await openTutor(page, browserContext, extensionId, testInfo);

    // "дом" is a normal dictionary word (has readings). Match on the stored
    // original text, since the visible text may be stress-marked (e.g. "до́м").
    const found = await page.evaluate(() => {
      const span = Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .find(s => (s.dataset.originalText || s.textContent) === 'дом');
      if (!span) return false;
      span.id = 'known-token';
      return true;
    });
    expect(found, 'fixture must contain the dictionary word "дом"').toBe(true);
    await page.locator('#known-token').click();

    const results = sidePanelPage.locator('#reading-tutor-results');
    await expect(results.locator('.lemma-group')).toHaveCount(1, { timeout: 20000 });
    await expect(results).not.toContainText('not found in dictionary');
  });
});
