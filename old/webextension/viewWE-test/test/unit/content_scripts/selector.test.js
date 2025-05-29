/**
 * Tests for the selector.js file of the VIEW add-on.
 *
 * Created by eduard on 29.03.17.
 */

"use strict";

import $ from 'jquery';
import view from '../../../../viewWE/content_scripts/js/view.js';

describe("selector.js", function() {
  let sandbox;

  const sentenceSelector = "sentence:not([data-isbasedonblock])";
  const enhancementSelector = "viewenhancement";
  const selectedClass = "selected";

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fixture.load("/viewWE-test/fixtures/ru-nouns-mc-and-cloze.html");
  });

  afterEach(function() {
    sandbox.restore();
    fixture.cleanup();
  });

  describe("jquery selectors", function() {
    it("should be able to find all required jquery selectors for this module", function() {
      // some selectors only need the element, its enough if they exist
      // some selectors need the val(), text() or attr("link"),
      // if there is the value we expect, they exist as well
      // maintain this test, if there are additions or changes
      // the expectations below don't need to be tested in other tests again
      // the selectors below can be freely used in the tests without problems

      expect($("sentence[data-isbasedonblock]").length).to.be.above(0);
      expect($(enhancementSelector).length).to.be.above(0);
      expect($("[data-filters~='Pl']").length).to.be.above(0);
    });
  });

  describe("select", function() {
    it("should not have class 'selected' for all enhancements in inferred sentences", function() {
      view.selector.select("all");

      $("sentence[data-isbasedonblock]").each(function() {
        expect($(this).find(enhancementSelector).hasClass(selectedClass)).to.be.false;
      });
    });

    it("should have class 'selected' for all enhancements as the filter is 'all'", function() {
      view.selector.select("all");

      $(sentenceSelector).each(function() {
        expect($(this).find(enhancementSelector).hasClass(selectedClass)).to.be.true;
      });
    });

    it("should have class 'selected' for all enhancements as the filter is 'no-filter'", function() {
      view.selector.select("no-filter");

      $(sentenceSelector).each(function() {
        expect($(this).find(enhancementSelector).hasClass(selectedClass)).to.be.true;
      });
    });

    it("should have class 'selected' for all enhancements having the 'data-filter' attribute with the value 'Pl'", function() {
      const filter = "Pl";

      view.selector.select("Pl");

      $(sentenceSelector).each(function() {
        expect($(this).find("[data-filters~='" + filter + "']").hasClass(selectedClass)).to.be.true;
      });
    });
  });
});
