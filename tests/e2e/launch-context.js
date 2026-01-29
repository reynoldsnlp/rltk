const { chromium } = require('@playwright/test');

const CI_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--enable-logging',
  '--v=1',
  '--log-file=/tmp/chrome.log',
  '--enable-crash-reporter',
  `--crash-dumps-dir=${process.env.CHROME_CRASH_DIR || '/tmp/chrome-crash'}`,
];

async function launchPersistentContext(userDataDir, { extensionPath }) {
  const args = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];

  if (process.env.CI) {
    args.push(...CI_CHROMIUM_ARGS);
  }

  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args,
  });
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
  ensureExtensionReady,
};
