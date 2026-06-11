// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { openSidePanel } = require('./test-helpers');


test.describe('Sidepanel access modal', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('shows Access Required modal for regular pages without access', async ({ page, browserContext, extensionId, serviceWorker }) => {
    await page.goto('https://example.com');
    await expect.poll(async () => {
      return serviceWorker.evaluate(() => {
        return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => (tabs[0] ? tabs[0].id : null));
      });
    }).not.toBeNull();

    const tabId = await serviceWorker.evaluate(() => {
      return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => (tabs[0] ? tabs[0].id : null));
    });
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanel(browserContext, extensionId, tabId, { waitForReadingTutor: false });

    const accessModal = sidePanelPage.locator('#access-modal');
    const chromeModal = sidePanelPage.locator('#chrome-access-modal');

    await expect(accessModal).toBeVisible();
    await expect(chromeModal).toBeHidden();
  });
});
