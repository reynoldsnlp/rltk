export default class Storage {
  constructor(browser) {
    this.chrome = browser;
  }

  /**
   * Wrapper around chrome.storage.local.get, returns a Promise.
   * On failure (keys not present), promise is rejected
   *
   * @param {mixed} items A single key to get, or a list of keys to get.
   *
   * @return {Promise} A promise with the result fetched from storage local
   */
  get(items) {
    return new Promise((resolve, reject) => {
      this.chrome.storage.local.get(items, (result) => {
        const error = this.chrome.runtime.lastError;
        if (error) {
          reject(Error(`Local storage failure: ${error.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Wrapper around chrome.storage.local.get, returns a Promise.
   * If a key is not present or another storage error occurs, the provided
   * default is returned.
   *
   * @param {mixed} items A single key to get, or a list of keys to get.
   * @param {mixed} defaultResult A default to return in case of failure.
   *
   * @return {Promise} A promise with the result fetched from storage local or default result
   */
  async getOrDefault(items, defaultResult) {
    try {
      const result = await this.get(items);
      if (Object.keys(result).length === 0) {
        return defaultResult;
      }
      return result;
    } catch (e) {
      return defaultResult;
    }
  }

  /**
   * Wrapper around chrome.storage.local.set, returns a Promise.
   *
   * @param {mixed} items An object with assignments to be stored
   *
   * @return {Promise} A promise with an empty value
   */
  set(items) {
    return new Promise((resolve, reject) => {
      this.chrome.storage.local.set(items, () => {
        const error = this.chrome.runtime.lastError;
        if (error) {
          reject(Error(`Local storage failure: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}
