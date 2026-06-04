const { expect } = require('@playwright/test');

async function waitForFixtureTabId(browserContext, fixtureUrl, options = {}) {
  const timeout = options.timeout ?? 15000;
  const pollInterval = options.pollInterval ?? 200;
  const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const tabId = await serviceWorker.evaluate(async (targetUrl) => {
      const exact = await chrome.tabs.query({ url: targetUrl });
      return exact.length > 0 ? exact[0].id : null;
    }, fixtureUrl);

    if (tabId) {
      return tabId;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timed out waiting for tab with URL: ${fixtureUrl}`);
}

async function waitForSidePanelReady(sidePanelPage, options = {}) {
  const waitForReadingTutor = options.waitForReadingTutor !== false;
  await sidePanelPage.waitForLoadState('domcontentloaded');
  await sidePanelPage.waitForSelector('.tab-button[data-tab="reading-tutor"]', { timeout: 10000 });
  await sidePanelPage.waitForSelector('#topic-menu', { timeout: 10000, state: 'attached' });
  await sidePanelPage.waitForSelector('#activity-menu', { timeout: 10000, state: 'attached' });
  await sidePanelPage.waitForSelector('#enhance-button', { timeout: 10000, state: 'attached' });
  if (waitForReadingTutor) {
    await sidePanelPage.waitForFunction(() => {
      const loading = document.getElementById('loading');
      const loadingHidden = !loading || getComputedStyle(loading).display === 'none';
      const container = document.getElementById('reading-tutor-results');
      const prepDone = !container || !container.textContent.includes('Preparing text...');
      return loadingHidden && prepDone;
    }, { timeout: 20000 });
  }
}

// Open a fixture page in the current tab and return its URL + the tab id the
// extension assigned it. Collapses the goto + waitForFixtureTabId pair that
// ~25 specs duplicate, each slightly differently.
async function openFixture(page, browserContext, testInfo, fixtureName) {
  const baseURL = testInfo.project.use.baseURL;
  const fixtureUrl = `${baseURL}/tests/fixtures/${fixtureName}`;
  await page.goto(fixtureUrl);
  const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
  return { fixtureUrl, tabId };
}

// Open the side panel bound to a given tab and wait for it to be ready.
async function openSidePanel(browserContext, extensionId, tabId, options = {}) {
  const sidePanelPage = await browserContext.newPage();
  await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
  await waitForSidePanelReady(sidePanelPage, options);
  return sidePanelPage;
}

// Canonical "reading tutor analysis has settled" wait. The two weak signals
// specs use today each race: ".ʁ-reading-tutor spans exist" is true mid-analysis
// (spans stream in), and the refresh button is hidden while processing. Waiting
// for BOTH — spans present AND #reading-tutor-refresh-wrapper visible (it is
// display:none during processing, restored when done) — is the one signal that
// reliably means "safe to interact." Prefer this over either half alone.
async function waitForReadingTutorSettled(page, sidePanelPage, options = {}) {
  const timeout = options.timeout ?? 60000;
  await page.waitForFunction(
    () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
    { timeout }
  );
  if (sidePanelPage) {
    await expect(sidePanelPage.locator('#reading-tutor-refresh-wrapper'))
      .toBeVisible({ timeout: 15000 });
  }
}

// Test-only hook: slow each analysis batch so timing-dependent flows (pausing
// mid-analysis, observing batch progress) get a deterministic window instead of
// racing real analysis speed. Optionally replace #target with `paragraphs`
// copies of `paragraphText` to control how many batches the page splits into
// (~5 full paragraphs per 10KB batch).
async function injectSlowEnhance(page, { delayMs = 1500, paragraphs = null, paragraphText = null } = {}) {
  await page.evaluate(({ delay, count, text }) => {
    document.documentElement.dataset.rltkTestSlowEnhance = String(delay);
    if (count && text) {
      const target = document.getElementById('target');
      if (target) {
        target.innerHTML = Array.from({ length: count }, () => `<p>${text}</p>`).join('');
      }
    }
  }, { delay: delayMs, count: paragraphs, text: paragraphText });
}

module.exports = {
  waitForFixtureTabId,
  waitForSidePanelReady,
  openFixture,
  openSidePanel,
  waitForReadingTutorSettled,
  injectSlowEnhance,
};
