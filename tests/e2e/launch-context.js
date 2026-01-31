const { chromium } = require('@playwright/test');

async function launchPersistentContext(userDataDir, { extensionPath }) {
  const args = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args,
    ignoreDefaultArgs: ['--disable-breakpad'],
  });

  // Keep at least one tab open so Chromium doesn't exit when tests close pages.
  const keepAlivePage = await context.newPage();
  await keepAlivePage.goto('about:blank');
  context.__rltkKeepAlivePage = keepAlivePage;

  return context;
}

async function closeNonKeepAlivePages(browserContext) {
  const keepAlivePage = browserContext.__rltkKeepAlivePage;

  for (const page of browserContext.pages()) {
    if (keepAlivePage && page === keepAlivePage) {
      continue;
    }
    await page.close();
  }

  if (!browserContext.__rltkKeepAlivePage || browserContext.__rltkKeepAlivePage.isClosed()) {
    const newKeepAlivePage = await browserContext.newPage();
    await newKeepAlivePage.goto('about:blank');
    browserContext.__rltkKeepAlivePage = newKeepAlivePage;
  }
}

async function ensureExtensionReady(browserContext) {
  const serviceWorker = browserContext.serviceWorkers()[0]
    || await browserContext.waitForEvent('serviceworker');
  const swUrl = serviceWorker.url();
  const extensionId = swUrl.split('/')[2];

  const probePage = await browserContext.newPage();
  try {
    await probePage.goto(`chrome-extension://${extensionId}/rltk/background.js`);
    await probePage.waitForFunction(
      () => typeof chrome !== 'undefined' && !!chrome.runtime?.id,
      { timeout: 10000 }
    );
  } finally {
    await probePage.close();
  }

  return { serviceWorker, extensionId };
}

module.exports = {
  launchPersistentContext,
  closeNonKeepAlivePages,
  ensureExtensionReady,
};
