"use strict";

const assert = require("assert");
const utils = require("./utils");
const firefox = require("selenium-webdriver/firefox");
const Context = firefox.Context;

describe("Example Add-on Functional Tests", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(10000);

  let driver;

  before(function() {
    const promise = utils.promiseSetupDriver();

    return promise.then(newDriver => {
      driver = newDriver;
      return Promise.resolve();
    });
  });

  after(function() {
    return driver.quit();
  });

  it("should have a toolbar button", function() {
    return utils.promiseAddonButton(driver)
      .then(button => button.getAttribute("tooltiptext"))
      .then(text => assert.equal(text, "VIEW"));
  });

  // it("should open a webpage when the button is clicked", function() {
  //   return driver.getAllWindowHandles()
  //     .then(() => assert.equal(1, 1))
  //     // Find the button, click it and check it opens a new tab.
  //     .then(function*() {
  //       const button = yield utils.promiseAddonButton(driver);
  //
  //       button.click();
  //
  //       return driver.wait(function*() {
  //         const handles = yield driver.getAllWindowHandles();
  //         return handles.length === 2;
  //       }, 9000, "Should have opened a new tab.");
  //     })
  //     // Switch selenium to the new tab.
  //     .then(function*() {
  //       const handles = yield driver.getAllWindowHandles();
  //
  //       const currentHandle = yield driver.getWindowHandle();
  //
  //       driver.setContext(Context.CONTENT);
  //       // Find the new window handle.
  //       let newWindowHandle = null;
  //       for (const handle of handles) {
  //         if (handle !== currentHandle) {
  //           newWindowHandle = handle;
  //         }
  //       }
  //
  //       return driver.switchTo().window(newWindowHandle);
  //     })
  //     // Check the tab has loaded the right page.
  //     // We use driver.wait to wait for the page to be loaded, as due to the click()
  //     // we're not able to easily use the load listeners built into selenium.
  //     .then(() => driver.wait(function*() {
  //       const currentUrl = yield driver.getCurrentUrl();
  //
  //       return currentUrl === "https://www.mozilla.org/de/";
  //     }, 5000, "Should have loaded mozilla.org"));
  // });
});
