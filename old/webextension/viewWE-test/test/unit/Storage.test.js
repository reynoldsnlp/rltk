import Storage from "../../../viewWE/Storage";
import chrome from 'sinon-chrome/extensions';

describe("Storage", (done) => {
  const storage = new Storage();

  before(() => {
    window.chrome = chrome;
  });

  it("Sets data", () => {
    chrome.storage.local.set.yields();

    return storage.set({"foo": "bar"})
      .then(() => {
        sinon.assert.calledWith(chrome.storage.local.set, {"foo": "bar"});
      });
  });

  it("Gets data", () => {
    chrome.storage.local.get.yields({"foo": "bar"});

    return storage.get("foo").then(data => {
      expect(data.foo).to.equal("bar");
    });
  });

  it("Rejects promise on failed get", () => {
    chrome.runtime.lastError = new Error("teststring");
    return storage.get("any")
      .then(
        () => sinon.assert.fail("shouldn't have gotten anything back"),
        (e) => expect(e.message).to.contain("teststring")
      );
  });

  it("Rejects promise on failed set", () => {
    chrome.runtime.lastError = new Error("teststring");
    return storage.set({any: "any"})
      .then(
        () => sinon.assert.fail("shouldn't have gotten anything back"),
        (e) => expect(e.message).to.contain("teststring")
      );
  });
});
