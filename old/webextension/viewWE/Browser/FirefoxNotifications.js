export default class FirefoxNotifications {
  constructor(browser) {
    this.browser = browser;
  }

  create(id, options) {
    return this.browser.notifications.create(id, options);
  }

  clear(id) {
    return this.browser.notifications.clear(id);
  }
}
