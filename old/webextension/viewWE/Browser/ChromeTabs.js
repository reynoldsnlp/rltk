import FirefoxTabs from './FirefoxTabs';

export default class ChromeTabs extends FirefoxTabs {
  sendMessage(tabId, message, options) {
    const tabs = this.browser.tabs;
    const runtime = this.browser.runtime;
    return new Promise((resolve, reject) => {
      tabs.sendMessage(tabId, message, options, (response) => {
        if (!response && runtime.lastError) {
          reject(runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}
