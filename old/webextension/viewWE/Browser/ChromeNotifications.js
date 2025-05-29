export default class ChromeNotifications {
  constructor(browser) {
    this.browser = browser;
  }

  create(id, options) {
    return new Promise(
      resolve => this.browser.notifications.create(id, options, result => resolve(result)),
    );
  }

  clear(id) {
    return new Promise(
      resolve => this.browser.notifications.create(id, result => resolve(result)),
    );
  }
}
