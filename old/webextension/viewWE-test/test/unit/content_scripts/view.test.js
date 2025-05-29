/**
 * Tests for the view.js file of the VIEW add-on.
 *
 * Created by eduard on 11.01.17.
 */

"use strict";

import chrome from 'sinon-chrome/extensions';
import view from '../../../../viewWE/content_scripts/js/view.js';

describe("view.js", function() {
  let sandbox;

  beforeEach(function() {
    window.chrome = chrome;
    sandbox = sinon.sandbox.create();
    chrome.storage.onChanged.addListener(view.setStorageChange);
  });

  afterEach(function() {
    sandbox.restore();
    chrome.storage.local.get.reset();
    view.item1 = "";
    view.item2 = "";
  });

  describe("setStorageItemsAndAddToolbar", function() {
    it("should call setItems(storageItems)", function() {
      const setItemsStub = sandbox.stub(view, "setItems");
      sandbox.stub(view.toolbar, "add");

      const storageItems = {};

      chrome.storage.local.get.yields(storageItems);

      view.setStorageItemsAndAddToolbar();

      sinon.assert.calledOnce(setItemsStub);
      sinon.assert.calledWithExactly(setItemsStub, storageItems);
    });

    it("should set the given items to view", function() {
      const item1 = "item1";
      const item2 = "item1";
      const storageItems = {item1, item2};

      view.setItems(storageItems);

      expect(view.item1).to.equal(item1);
      expect(view.item2).to.equal(item2);
    });

    it("should call view.toolbar.add()", function() {
      const toolbarAddStub = sandbox.stub(view.toolbar, "add");

      chrome.storage.local.get.yields({});

      view.setStorageItemsAndAddToolbar();

      sinon.assert.calledOnce(toolbarAddStub);
    });
  });

  describe("setStorageChange", function() {
    it("should set the given changes to view on change", function() {
      const item1 = {
        oldValue: "old1",
        newValue: "new1"
      };
      const item2 = {
        oldValue: "old2",
        newValue: "new2"
      };
      const changes = {item1, item2};

      chrome.storage.onChanged.trigger(changes);

      expect(view.item1).to.equal(item1.newValue);
      expect(view.item2).to.equal(item2.newValue);
    });
  });
});
