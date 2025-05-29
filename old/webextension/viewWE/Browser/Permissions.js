import isFirefox from '../UserAgent';

export default class Permissions {
  constructor(myChrome) {
    this.isFirefox = isFirefox();
    this.chrome = myChrome;
  }

  getAll() {
    return new Promise((resolve) => {
      this.chrome.permissions.getAll(results => resolve(results));
    });
  }

  /**
   * Request permission. First queries whether permission needs to be requested.
   *
   * @param {Object} object The permission object
   *
   * @return {Promise} A fulfilled promise on success, rejected if permission was not granted
   */
  async request(object) {
    let isPermissionEnabled = false;

    if (!this.isFirefox) {
      isPermissionEnabled = await this.contains(object);
    }

    if (!isPermissionEnabled) {
      await this.uncheckedRequest(object);
    }
  }

  async requestOrigin(url) {
    return this.request({ origins: [url] });
  }

  async removeOrigin(url) {
    return this.remove({ origins: [url] });
  }

  remove(object) {
    return new Promise((resolve, reject) => {
      this.chrome.permissions.remove(
        object,
        (removed) => {
          if (removed) {
            resolve();
          } else {
            reject(`Permission to ${JSON.stringify(object)} could not be removed (${removed})`);
          }
        },
      );
    });
  }

  uncheckedRequest(object) {
    return new Promise((resolve, reject) => {
      this.chrome.permissions.request(
        object,
        (granted) => {
          if (granted) {
            resolve(granted);
          } else {
            reject(Error(`Permission for ${JSON.stringify(object)} not granted`));
          }
        });
    });
  }

  contains(object) {
    return new Promise((resolve) => {
      this.chrome.permissions.contains(
        object,
        result => resolve(Boolean(result)),
      );
    });
  }
}
