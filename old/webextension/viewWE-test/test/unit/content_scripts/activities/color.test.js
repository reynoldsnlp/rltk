/**
 * Tests for the color.js file of the VIEW add-on.
 *
 * Created by eduard on 20.01.17.
 */

"use strict";

import $ from 'jquery';
import view from '../../../../../viewWE/content_scripts/js/view.js';

describe("color.js", function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fixture.load("/viewWE-test/fixtures/ru-nouns-color.html");
    view.selector.select("Sg");
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

      expect($("viewenhancement").length).to.be.above(0);
      expect($("[data-type='hit']").length).to.be.above(0);
      expect($("[data-type='ambiguity']").length).to.be.above(0);
      expect($(".selected").length).to.be.above(0);
    });
  });

  describe("run", function() {
    it("should add the color class to all viewenhancement tags", function() {
      const topic = "nouns";
      const colorizeStyleClass = "colorize-style-nouns";
      const $Enhancements = $("viewenhancement.selected");

      expect($Enhancements.hasClass(colorizeStyleClass)).to.be.false;

      view.color.run(topic);

      $Enhancements.each(function() {
        expect($(this).hasClass(colorizeStyleClass)).to.be.true;
      });
    });
  });
});
