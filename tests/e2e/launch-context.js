const { chromium } = require('@playwright/test');

const CI_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
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

module.exports = {
  launchPersistentContext,
};
