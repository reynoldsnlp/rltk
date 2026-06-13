// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForReadingTutorSettled } = require('./test-helpers');

// Reading Tutor annotates the whole page, so it's the strictest check for which
// DOM arrangements the annotator must skip or normalize.
test.describe('Annotator edge cases', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openReadingTutor(page, browserContext, extensionId, testInfo) {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/annotator-edge-cases.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);
    await waitForReadingTutorSettled(page, sidePanelPage);
    return sidePanelPage;
  }

  test('hidden, untaggable, and foreign-namespace text is not annotated', async ({ page, browserContext, extensionId }, testInfo) => {
    await openReadingTutor(page, browserContext, extensionId, testInfo);

    // The visible baseline word IS annotated (sanity check that the tutor ran).
    await page.waitForFunction(
      () => document.querySelectorAll('#visible .ʁ-reading-tutor').length > 0,
      { timeout: 30000 }
    );

    const counts = await page.evaluate(() => ({
      hidden: document.querySelectorAll('#hidden .ʁ-reading-tutor').length,
      textarea: document.querySelectorAll('#ta .ʁ-reading-tutor').length,
      select: document.querySelectorAll('#sel .ʁ-reading-tutor').length,
      svg: document.querySelectorAll('#svg .ʁ-reading-tutor').length,
      // The form control's value must be left untouched (no spans injected).
      textareaValue: document.getElementById('ta').value,
      svgText: document.querySelector('#svg text').textContent,
    }));

    expect(counts.hidden).toBe(0);
    expect(counts.textarea).toBe(0);
    expect(counts.select).toBe(0);
    expect(counts.svg).toBe(0);
    expect(counts.textareaValue).toBe('Текст в поле ввода.');
    expect(counts.svgText).toBe('Овощи на графике');
  });

  test('invisible in-word characters do not break word recognition', async ({ page, browserContext, extensionId }, testInfo) => {
    await openReadingTutor(page, browserContext, extensionId, testInfo);

    // "ча<soft-hyphen>сто" must be recognized as "часто". Reading Tutor only
    // creates a span when the word has readings, and a word split across nodes
    // carries its whole-word form in data-token-text — so a span whose
    // tokenText is exactly "часто" proves the invisible char was normalized out.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('#invisible-chars .ʁ-reading-tutor'))
        .some(s => s.dataset.tokenText === 'часто'),
      { timeout: 30000 }
    );

    // The soft hyphen stays in the DOM (between the fragment spans), so the
    // paragraph still reads correctly once invisible characters are stripped.
    const cleaned = await page.evaluate(() =>
      document.getElementById('invisible-chars').textContent.replace(/[\u00AD\u200B\u200C\u200D\u2060\uFEFF\u0300-\u036F]/g, '')
    );
    expect(cleaned).toContain('часто');
    expect(cleaned).toContain('свежие');
  });
});
