// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Side panel close restores all tabs', () => {
  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('closing side panel restores enhanced tabs with stored state', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureA = `${baseURL}/tests/fixtures/nouns.html`;
    const fixtureB = `${baseURL}/tests/fixtures/stress.html`;

    await page.goto(fixtureA);
    await page.bringToFront();
    const tabIdA = await waitForFixtureTabId(browserContext, fixtureA);

    const pageB = await browserContext.newPage();
    await pageB.goto(fixtureB);
    const tabIdB = await waitForFixtureTabId(browserContext, fixtureB);

    const selections = { topic: 'reading-tutor', filter: 'all', activity: 'explore' };

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabIdA}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.evaluate(async ({ selections, tabIdA, tabIdB }) => {
      await chrome.runtime.sendMessage({ action: 'enhance', selections, tabId: tabIdA });
      await chrome.runtime.sendMessage({ action: 'enhance', selections, tabId: tabIdB });
    }, { selections, tabIdA, tabIdB });

    await page.waitForFunction(() => document.querySelectorAll('.ʁ').length > 0, { timeout: 60000 });
    await pageB.waitForFunction(() => document.querySelectorAll('.ʁ').length > 0, { timeout: 60000 });

    await sidePanelPage.evaluate(({ tabIdA, tabIdB }) => {
      const storage = chrome.storage.session || chrome.storage.local;
      return storage.set({
        [`tabState_${tabIdA}`]: { pageEnhanced: true },
        [`tabState_${tabIdB}`]: { pageEnhanced: true }
      });
    }, { tabIdA, tabIdB });

    await sidePanelPage.close();

    await page.waitForFunction(() => document.querySelectorAll('.ʁ').length === 0, { timeout: 30000 });
    await pageB.waitForFunction(() => document.querySelectorAll('.ʁ').length === 0, { timeout: 30000 });
  });
});
