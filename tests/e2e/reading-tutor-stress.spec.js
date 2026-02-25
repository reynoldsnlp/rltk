const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial' });

test.describe('Reading Tutor stress select', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openReadingTutor(browserContext, extensionId, tabId) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);
    return sidePanelPage;
  }

  test('stress select is present and defaults to No stress', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);

    const stressSelect = sidePanelPage.locator('#reading-tutor-stress');
    await expect(stressSelect).toBeVisible();
    await expect(stressSelect).toHaveValue('none');
  });

  test('Mark stress shows accent marks in reading tutor spans', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');

    // At least one span with unambiguous stress should show a combining acute accent.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );
  });

  test('No stress restores original text after Mark stress', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    // Enable mark stress and wait for accents to appear.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );

    // Switch back to No stress — all accent marks should disappear.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'none');
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301')),
      { timeout: 10000 }
    );
  });

  test('Hover stress reveals accent on mouseenter and hides on mouseleave', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    await sidePanelPage.selectOption('#reading-tutor-stress', 'hover');

    // No accent marks without hovering.
    const hasAccentWithoutHover = await page.evaluate(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301'))
    );
    expect(hasAccentWithoutHover).toBe(false);

    // Poll until a span responds to mouseenter with an accent mark — this also
    // verifies that mouseleave restores the original text.
    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
      for (const span of spans) {
        span.dispatchEvent(new Event('mouseenter', { bubbles: true }));
        const hasAccent = (span.textContent || '').includes('\u0301');
        span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
        if (hasAccent) return true;
      }
      return false;
    }, { timeout: 30000 });

    // After all mouseleave events, no accent marks should remain.
    const hasAccentAfterLeave = await page.evaluate(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => (s.textContent || '').includes('\u0301'))
    );
    expect(hasAccentAfterLeave).toBe(false);
  });

  test('stress is applied automatically when analysis completes with mode already selected', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    await page.bringToFront();
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openReadingTutor(browserContext, extensionId, tabId);
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    // Select Mark stress, then trigger a full re-analysis.
    await sidePanelPage.selectOption('#reading-tutor-stress', 'mark');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    await refreshButton.click();

    // Wait for the re-analysis to complete and produce new spans.
    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });

    // Stress should be applied automatically — no further interaction required.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some(s => s.dataset.stressStatus === 'unambiguous' && (s.textContent || '').includes('\u0301')),
      { timeout: 30000 }
    );
  });
});
