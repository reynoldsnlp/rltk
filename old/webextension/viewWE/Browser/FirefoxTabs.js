export default class FirefoxTabs {
  constructor(browser) {
    this.browser = browser;
    this.onUpdated = {
      addListener: f => browser.tabs.onUpdated.addListener(f),
    };
  }

  sendMessage(tabId, message, options) {
    return this.browser.tabs.sendMessage(tabId, message, options);
  }

  executeScript(tabId, js) {
    return new Promise((resolve) => {
      this.browser.tabs.executeScript(
        tabId,
        js,
        result => resolve(result),
      );
    });
  }

  insertJsCode(tabId, js) {
    return this.executeScript(tabId, { code: js });
  }

  insertJsFile(tabId, jsFile) {
    return this.executeScript(tabId, { file: jsFile });
  }

  insertCSS(tabId, css) {
    return new Promise((resolve) => {
      this.browser.tabs.insertCSS(
        tabId,
        css,
        () => resolve(),
      );
    });
  }

  insertCssFile(tabId, cssFile) {
    return this.insertCSS(tabId, { file: cssFile });
  }
}
