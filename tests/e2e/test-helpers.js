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

module.exports = {
  waitForFixtureTabId,
  waitForSidePanelReady,
};
