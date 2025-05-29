/**
 * Tests for the mc.js file of the VIEW add-on.
 *
 * Created by eduard on 20.01.17.
 */

"use strict";

import $ from 'jquery';
import chrome from 'sinon-chrome';
import view from '../../../../../viewWE/content_scripts/js/view.js';
import unitTest from '../../unit-test.js';

describe("mc.js", function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fixture.load("/viewWE-test/fixtures/ru-nouns-mc-and-cloze.html");
    unitTest.setViewDefaults();
    view.language = "ru";
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
      expect($("[data-type='clue']").length).to.be.above(0);
      expect($(".selected").length).to.be.above(0);
    });
  });

  describe("run", function() {
    it("should call exerciseHandler(createExercise)", function() {
      const exerciseHandlerSpy = sandbox.spy(view.activityHelper, "exerciseHandler");

      view.mc.run();

      sinon.assert.calledOnce(exerciseHandlerSpy);
      sinon.assert.calledWithExactly(exerciseHandlerSpy, view.mc.createExercise);
    });

    describe("createExercise", function() {
      it("should call detectCapitalization(hitText)", function() {
        const detectCapitalizationSpy = sandbox.spy(view.lib, "detectCapitalization");

        const $hit = $("[data-type='hit']").first();
        const hitText = $hit.text();

        view.mc.createExercise($hit);

        sinon.assert.calledOnce(detectCapitalizationSpy);
        sinon.assert.calledWithExactly(detectCapitalizationSpy, hitText);

        expect(detectCapitalizationSpy.firstCall.returnValue).to.equal(2);
      });

      it("should call getCorrectAnswer($hit, capType)", function() {
        const getCorrectAnswerSpy = sandbox.spy(view.activityHelper, "getCorrectAnswer");

        const $hit = $("[data-type='hit']").first();

        view.mc.createExercise($hit);

        sinon.assert.calledOnce(getCorrectAnswerSpy);
        sinon.assert.calledWithExactly(getCorrectAnswerSpy,
          $hit,
          2
        );

        expect(getCorrectAnswerSpy.firstCall.returnValue).to.equal("Усвоение");
      });

      it("should call getOptions($hit, answer, capType)", function() {
        const getOptionsSpy = sandbox.spy(view.mc, "getOptions");

        const $hit = $("[data-type='hit']").first();
        const answer = "Усвоение";

        view.mc.createExercise($hit);

        sinon.assert.calledOnce(getOptionsSpy);
        sinon.assert.calledWithExactly(getOptionsSpy,
          $hit,
          answer,
          2
        );

        expect(getOptionsSpy.firstCall.returnValue)
        .to.have.members(["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"]);
      });

      it("should call createSelectBox(options, hitText, answer, $hit)", function() {
        const getOptionsSpy = sandbox.spy(view.mc, "getOptions");
        const createSelectBoxSpy = sandbox.spy(view.mc, "createSelectBox");

        const $hit = $("[data-type='hit']").first();
        const hitText = $hit.text();
        const answer = "Усвоение";

        view.mc.createExercise($hit);

        sinon.assert.calledOnce(createSelectBoxSpy);
        sinon.assert.calledWithExactly(createSelectBoxSpy,
          getOptionsSpy.firstCall.returnValue,
          hitText,
          answer,
          $hit
        );
      });

      it("should call createHint($hit)", function() {
        const createHintSpy = sandbox.spy(view.activityHelper, "createHint");

        const $hit = $("[data-type='hit']").first();

        view.mc.createExercise($hit);

        sinon.assert.calledOnce(createHintSpy);
        sinon.assert.calledWithExactly(createHintSpy, $hit);
      });

      describe("getOptions", function() {
        it("should call lib.shuffleList(distractors)", function() {
          const shuffleListSpy = sandbox.spy(view.lib, "shuffleList");

          const $hit = $("[data-type='hit']").first();
          const distractors = $hit.data("distractors").split(";");
          const answer = "Усвоение";

          view.mc.getOptions($hit, answer, 2);

          sinon.assert.calledTwice(shuffleListSpy);
          expect(shuffleListSpy.firstCall.args[0]).to.have.members(distractors);
        });

        it("should call fillOptions(distractors, answer, capType)", function() {
          const fillOptionsSpy = sandbox.spy(view.mc, "fillOptions");

          // make randomness predictable
          sandbox.stub(Math, "random").callsFake(function(){
            return 0.5;
          });

          const $hit = $("[data-type='hit']").first();
          const distractors = ["усвоению", "усвоение", "усвоения", "усвоении", "усвоением"];
          const answer = "Усвоение";

          view.mc.getOptions($hit, answer, 2);

          sinon.assert.calledOnce(fillOptionsSpy);
          sinon.assert.calledWith(fillOptionsSpy,
            distractors,
            answer,
            2
          );

          expect(fillOptionsSpy.firstCall.returnValue)
          .to.have.members(["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"]);
        });

        describe("fillOptions", function() {
          it("should call addOption(options, distractor, capType) only 5 times, options length is limit", function() {
            const addOptionSpy = sandbox.spy(view.mc, "addOption");

            const distractors = [
              "видит",
              "видят",
              "вижу",
              "видим",
              "видите",
              "видишь"
            ];

            view.mc.fillOptions(distractors, "видят", 0);

            sinon.assert.callCount(addOptionSpy, 5);

            expect(addOptionSpy.getCall(4).args[1]).to.equal("видят");
          });

          it("should call addOption(options, distractor, capType) 3 times, distractor length is limit", function() {
            const addOptionSpy = sandbox.spy(view.mc, "addOption");

            const distractors = [
              "роль",
              "роли",
              "ролью"
            ];

            view.mc.fillOptions(distractors, "роли", 0);

            sinon.assert.callCount(addOptionSpy, 3);

            expect(addOptionSpy.getCall(2).args[1]).to.equal("роли");
          });

          it("should add an option to all options", function() {
            const options = [];

            view.mc.addOption(options, "усвоение", 2);

            expect(options).to.eql(["Усвоение"]);
          });

          it("should call shuffleList(options)", function() {
            const shuffleListSpy = sandbox.spy(view.lib, "shuffleList");

            const distractors = [
              "роль",
              "роли",
              "ролью"
            ];

            view.mc.fillOptions(distractors, "роли", 0);

            sinon.assert.calledOnce(shuffleListSpy);
            expect(shuffleListSpy.firstCall.args[0]).to.have.members(distractors);
          });
        });
      });

      describe("createSelectBox", function() {
        it("should find inside the hit a select box with the class 'viewinput'", function() {
          const options = ["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"];
          const $hit = $("[data-type='hit']").first();
          const hitText = $hit.text();
          const answer = "Усвоение";

          view.mc.createSelectBox(options, hitText, answer, $hit);

          expect($hit.find(".viewinput").length).to.be.above(0);
        });

        it("should call addSelectOption($SelectBox, optionText) 6 times", function() {
          const addSelectOptionSpy = sandbox.spy(view.mc, "addSelectOption");

          const options = ["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"];
          const $hit = $("[data-type='hit']").first();
          const hitText = $hit.text();
          const answer = "Усвоение";

          view.mc.createSelectBox(options, hitText, answer, $hit);

          sinon.assert.callCount(addSelectOptionSpy, 6);
        });

        it("should add an option to the select box", function() {
          const $SelectBox = $("<select>");

          const optionText = "Усвоение";

          view.mc.addSelectOption($SelectBox, optionText);

          expect($SelectBox.find("option").first().text()).to.equal(optionText);
        });

        it("should have all options inside the select box", function() {
          const options = ["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"];
          const $hit = $("[data-type='hit']").first();
          const hitText = $hit.text();
          const answer = "Усвоение";

          view.mc.createSelectBox(options, hitText, answer, $hit);

          const selectBoxOptions = [];
          $hit.find("option").each(function() {
            selectBoxOptions.push($(this).text());
          });

          expect(selectBoxOptions[0]).to.equal("");
          expect(selectBoxOptions).to.include.members(options);
        });

        it("should find the data 'view-answer' in the select box", function() {
          const options = ["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"];
          const $hit = $("[data-type='hit']").first();
          const hitText = $hit.text();
          const answer = "Усвоение";

          view.mc.createSelectBox(options, hitText, answer, $hit);

          const $SelectBox = $hit.find(".viewinput");

          expect($SelectBox.data("view-answer")).to.equal(answer);
        });

        it("should call empty() before append($SelectBox)", function() {
          const emptySpy = sandbox.spy($.fn, "empty");
          const appendSpy = sandbox.spy($.fn, "append");

          const options = ["Усвоение","Усвоении","Усвоению","Усвоением","Усвоения"];
          const $hit = $("[data-type='hit']").first();
          const hitText = $hit.text();
          const answer = "Усвоение";

          view.mc.createSelectBox(options, hitText, answer, $hit);

          sinon.assert.called(emptySpy); // unexpectedly called 6 times

          sinon.assert.called(appendSpy); // unexpectedly called 7 times

          sinon.assert.callOrder(emptySpy, appendSpy);
        });
      })
    });

    it("should initialize the input handler", function() {
      const eventSpy = sandbox.spy($.fn, "on");

      view.mc.run();

      // first with viewhint and second with select.viewinput
      sinon.assert.calledTwice(eventSpy);
      sinon.assert.calledWithExactly(eventSpy.getCall(1),
        "change",
        view.activityHelper.inputHandler
      );
    });

    it("should call inputHandler(e) on change", function() {
      const inputHandlerSpy = sandbox.spy(view.activityHelper, "inputHandler");

      view.mc.run();

      const $ElementBox = $(".viewinput").first();
      const $Option = $ElementBox.find("option").eq(1);

      $ElementBox.val($Option.text()).trigger("change");

      sinon.assert.calledOnce(inputHandlerSpy);
    });
  });
});
