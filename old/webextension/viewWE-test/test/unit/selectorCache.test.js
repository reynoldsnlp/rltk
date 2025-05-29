/**
 * Tests for the SelectorCache.js file of the VIEW add-on.
 *
 * Created by eduard on 23.07.16.
 */

"use strict";

import $ from 'jquery';
import chrome from 'sinon-chrome';
import SelectorCache from '../../../viewWE/SelectorCache.js';

window.chrome = chrome;

describe("SelectorCache.js", function() {
  let sandbox;
  let mySelectorCache;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    mySelectorCache = new SelectorCache();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("SelectorCache", function() {
    it("should get the wanted jquery selector", function() {
      const selectorSpy = sandbox.spy(mySelectorCache, "get");
      const getElementByIdSpy = sandbox.spy(document, "getElementById");
      const someSelector = "#someSelector";

      $("body").append("<div id='someSelector'>some text</div>");

      const $CachedObject = mySelectorCache.get(someSelector);
      mySelectorCache.get(someSelector);

      // even though we selected "someSelector" twice...
      sinon.assert.calledTwice(selectorSpy);
      sinon.assert.calledWithExactly(selectorSpy, someSelector);

      // ... in the background we selected it only once and retrieved it
      // from the $cache in the second call
      sinon.assert.calledOnce(getElementByIdSpy);
      sinon.assert.calledWithExactly(getElementByIdSpy, someSelector.substr(1));

      getElementByIdSpy.reset();

      $(someSelector);
      $(someSelector);

      // in contrast jquery selects it every time, without reusing
      // previous selections
      sinon.assert.calledTwice(getElementByIdSpy);

      // the $CachedObject is actually equal to the jquery object counterpart
      expect($CachedObject).to.deep.equal($(someSelector));

      // we can also use the $CachedObject in the same way we do use jquery objects
      expect($CachedObject.text()).to.equal("some text");

      $(someSelector).remove();
    });
  });
});
