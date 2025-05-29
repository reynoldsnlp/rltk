import isFirefox from './UserAgent';
import FirefoxTabs from './Browser/FirefoxTabs';
import ChromeTabs from './Browser/ChromeTabs';
import ChromeRuntime from './Browser/ChromeRuntime';
import FirefoxRuntime from './Browser/FirefoxRuntime';
import Permissions from './Browser/Permissions';
import Storage from './Browser/Storage';
import FirefoxNotifications from './Browser/FirefoxNotifications';
import ChromeNotifications from './Browser/ChromeNotifications';

export default class Browser {
  constructor(browser) {
    this.permissions = new Permissions(browser);
    this.storage = {
      local: new Storage(browser),
      onChanged: {
        addListener: f => browser.storage.onChanged.addListener(f),
      },
    };

    this.runtime = isFirefox()
      ? new FirefoxRuntime(browser)
      : new ChromeRuntime(browser);
    this.tabs = isFirefox()
      ? new FirefoxTabs(browser)
      : new ChromeTabs(browser);
    this.notifications = isFirefox()
      ? new FirefoxNotifications(browser)
      : new ChromeNotifications(browser);
  }
}
