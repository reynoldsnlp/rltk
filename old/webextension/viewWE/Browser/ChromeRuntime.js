import FirefoxRuntime from './FirefoxRuntime';

export default class Runtime extends FirefoxRuntime {
  constructor(browser) {
    super(browser);
    this.onMessage = {
      addListener: (f) => {
        browser.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            (async () => {
              const answer = await f(message, sender);
              sendResponse(answer);
            })();

            // return true has to come immediately for Chrome, which is why
            // execute the async function right away
            return true;
          },
        );
      },
    };
  }

  sendMessage(extensionId, data, options) {
    const runtime = this.browser.runtime;
    return new Promise((resolve, reject) => {
      runtime.sendMessage(extensionId, data, options, (response) => {
        if (!response && runtime.lastError) {
          reject(runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}
