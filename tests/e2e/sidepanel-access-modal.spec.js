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
    // Stub example.com so the test doesn't depend on external DNS/network (it
    // otherwise fails offline with ERR_NAME_NOT_RESOLVED). The page content is
    // irrelevant — we only need a tab whose URL is an origin the extension has
    // no host access to, which is still https://example.com/ after fulfilling.
    await page.route(/^https:\/\/example\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Example</title><h1>Example Domain</h1>' })
    );
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
