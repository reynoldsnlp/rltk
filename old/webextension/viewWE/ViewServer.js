/**
 * Call the server with a json body, expect a plain text body in return.
 *
 * @param {string} url The API endpoint to call
 * @param {Object} object The data which will be json-encoded.
 *
 * @return {Promise} Promise containing plain response text
 */
const _postPlain = function(url, object) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          resolve(xhr.responseText);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(Error(xhr.status + ": " + xhr.statusText));
      }
    };
    xhr.onerror = () => reject(Error("Network error. " + xhr.statusText));
    xhr.send(JSON.stringify(object));
  });
};

/**
 * Call the server with a json body, expect a json body in return.
 *
 * @param {string} url The API endpoint to call
 * @param {Object} object The data which will be json-encoded.
 *
 * @return {Promise} Promise containing parsed JSON response
 */
const _postJson = function(url, object) {
  return _postPlain(url, object).then(result => JSON.parse(result));
};

export default class ViewServer {
  constructor(url) {
    this.url = url;
  }

  /**
   * Retrieves a custom token from the server.
   *
   * @param {string} token The user token
   *
   * @return {Promise} Promise containing the custom token
   */
  async getCustomToken(token) {
    return _postJson(this.url + '/user', { token });
  }

  view(data) {
    return _postPlain(this.url + '/view', data);
  }
}
