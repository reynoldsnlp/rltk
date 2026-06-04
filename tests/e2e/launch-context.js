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
  const existing = browserContext.serviceWorkers()[0];
  const serviceWorker = existing || await browserContext.waitForEvent('serviceworker', { timeout: 60000 });
  const swUrl = serviceWorker.url();
  const extensionId = swUrl.split('/')[2];

  const probePage = await browserContext.newPage();
  try {
    await probePage.goto(`chrome-extension://${extensionId}/rltk/background.js`);
    await probePage.waitForFunction(
      () => typeof chrome !== 'undefined' && !!chrome.runtime?.id,
      { timeout: 10000 }
    );

    // Warm up the offscreen document once per worker. On first use the offscreen
    // loads ~570MB of HFST/CG3 WASM models, and that initialization blocks its
    // single JS thread — so the FIRST test in a cold worker otherwise races the
    // load and flakily times out, and model requests (e.g. roots' root_parses)
    // get starved behind it. The offscreen only answers a `generate` request
    // after initWasmTools() resolves, so awaiting one here guarantees WASM is
    // fully initialized before any test's timed assertions run. Best-effort and
    // bounded so a warm-up hiccup can never hang the suite.
    await probePage.evaluate(async () => {
      const warm = chrome.runtime
        .sendMessage({ action: 'generate', input: 'дом+N+Msc+Inan+Sg+Nom', useStress: false })
        .catch(() => {});
      await Promise.race([warm, new Promise((resolve) => setTimeout(resolve, 90000))]);
    });
  } finally {
    await probePage.close();
  }

  // Warm-up: navigate to the fixture server so Chrome is fully settled before
  // any test calls page.goto(). Without this the very first navigation can hang
  // or get ERR_ABORTED while Chrome is still transitioning from the extension
  // probe page.
  const warmupPage = await browserContext.newPage();
  try {
    await warmupPage.goto('http://127.0.0.1:19876/', { timeout: 10000 });
  } catch (_) {
    // Non-fatal: warm-up is best-effort.
  } finally {
    await warmupPage.close();
  }

  return { serviceWorker, extensionId };
}

module.exports = {
  launchPersistentContext,
  closeNonKeepAlivePages,
  ensureExtensionReady,
};
