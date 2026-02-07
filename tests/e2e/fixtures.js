const base = require('@playwright/test');
const path = require('path');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');

const test = base.test.extend({
  browserContext: [async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = `/tmp/test-user-data-dir-${Math.random()}`;
    const context = await launchPersistentContext(userDataDir, {
      extensionPath: pathToExtension,
    });
    await use(context);
    await context.close();
  }, { scope: 'worker' }],
  extensionId: [async ({ browserContext }, use) => {
    const extension = await ensureExtensionReady(browserContext);
    await use(extension.extensionId);
  }, { scope: 'worker' }],
  serviceWorker: [async ({ browserContext }, use) => {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    await use(serviceWorker);
  }, { scope: 'worker' }],
  page: async ({ browserContext }, use) => {
    const page = await browserContext.newPage();
    await use(page);
    await page.close();
  },
});

module.exports = {
  test,
  expect: base.expect,
  closeNonKeepAlivePages,
};
