export default class Runtime {
  constructor(browser) {
    this.browser = browser;
    this.onMessage = {
      addListener: (f) => {
        browser.runtime.onMessage.addListener(f);
      },
    };

    this.onInstalled = {
      addListener: (f) => {
        browser.runtime.onInstalled.addListener(f);
      },
    };
  }

  sendMessage(extensionId, data, options) {
    return this.browser.runtime.sendMessage(extensionId, data, options);
  }
}
