// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');


test.describe('Reading Tutor activation', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('processes the current page without tab switching', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.txt`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 15000 }
    );

    const readingTutorCount = await page.locator('.ʁ-reading-tutor').count();
    expect(readingTutorCount).toBeGreaterThan(0);
  });

  // Regression: a tab click during startup (before checkAccess() resolves) used to
  // skip activation — access was still unknown — and also suppress init's own
  // activation (userHasInteracted), leaving the tutor idle. Delay the access ping
  // so the click always lands inside that window.
  test('activates when the tab is clicked before the access check finishes', async ({ page, browserContext, extensionId }, testInfo) => {
    const fixtureUrl = `${testInfo.project.use.baseURL}/tests/fixtures/reading-tutor-mutation.html`;
    await page.goto(fixtureUrl);
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.addInitScript(() => {
      const sendMessage = chrome.tabs.sendMessage.bind(chrome.tabs);
      chrome.tabs.sendMessage = async (tabId, message, ...rest) => {
        if (message && message.action === 'ping') await new Promise(r => setTimeout(r, 1500));
        return sendMessage(tabId, message, ...rest);
      };
    });
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');

    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 15000 }
    );
  });
});
