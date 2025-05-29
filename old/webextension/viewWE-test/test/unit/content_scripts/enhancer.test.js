/**
 * Tests for the enhancement.js file of the VIEW add-on.
 *
 * Created by eduard on 29.03.17.
 */

"use strict";

import $ from 'jquery';
import chrome from 'sinon-chrome';
import view from '../../../../viewWE/content_scripts/js/view.js';
import unitTest from '../unit-test.js';
import SelectorCache from '../../../../viewWE/SelectorCache.js';

describe("enhancer.js", function() {
  let sandbox;
  let jsonDataNouns;

  const $NoMarkup = $("<div>");

  before(function() {
    fixture.load("/viewWE-test/fixtures/ru-no-markup.html");
    $NoMarkup.html($("#ru-no-markup-body").html());
    $("body").append($("<div id='wertiview-content'>"));
  });

  beforeEach(function() {
    fixture.load("/viewWE-test/fixtures/toolbar.html", true);
    fixture.load("/viewWE-test/fixtures/debug-sentence-markup.html", true);
    fixture.load("/viewWE-test/fixtures/ru-nouns-mc-and-cloze.html", true);

    jsonDataNouns = fixture.load("viewWE-test/fixtures/json/nouns.json", true);

    $("#wertiview-content").html($NoMarkup.html());

    sandbox = sinon.sandbox.create();

    unitTest.setViewDefaults();

    view.toolbar.$cache = new SelectorCache();

    view.originalContent = $NoMarkup.html();
    window.chrome = chrome;
  });

  afterEach(function() {
    sandbox.restore();

    fixture.cleanup();

    chrome.runtime.sendMessage.reset();
  });

  describe("jquery selectors", function() {
    it("should be able to find all required jquery selectors for this module", function() {
      // some selectors only need the element, its enough if they exist
      // some selectors need the val(), text() or attr("link"),
      // if there is the value we expect, they exist as well
      // maintain this test, if there are additions or changes
      // the expectations below don't need to be tested in other tests again
      // the selectors below can be freely used in the tests without problems
      expect($("#wertiview-content").length).to.be.above(0);
      expect($("#ru-no-markup-body").length).to.be.above(0);
    });
  });

  describe("enhance", function() {
    beforeEach(() => {
      view.activity = "color";
    });

    it("should call restoreToOriginal()", function() {
      const restoreToOriginalSpy = sandbox.spy(view.enhancer, "restoreToOriginal");

      view.enhancer.enhance();

      sinon.assert.calledOnce(restoreToOriginalSpy);
    });

    describe("restoreToOriginal", function() {
      it("should call view.lib.createContentElement(view.originalContent)", function() {
        const createContentElementSpy = sandbox.spy(view.lib, "createContentElement");

        view.enhancer.restoreToOriginal();

        sinon.assert.calledOnce(createContentElementSpy);
        sinon.assert.calledWithExactly(createContentElementSpy,
          view.originalContent
        );
      });

      it("should restore the wertiview-content div to the original state", function() {
        $("#wertiview-content").html($("p"));

        view.enhancer.restoreToOriginal();

        expect($("#wertiview-content").html()).to.equal(view.originalContent);
      });

      it("should not call view.notification.remove(), as there is no markup", function() {
        fixture.cleanup();
        const notificationRemoveSpy = sandbox.spy(view.notification, "remove");

        view.enhancer.restoreToOriginal();

        sinon.assert.notCalled(notificationRemoveSpy);
      });

      it("should call requestToToggleElement(msg, selector): hide restore button", function() {
        $(view.toolbar.selectorStart + "restore-button").show();

        view.enhancer.restoreToOriginal();

        expect($(view.toolbar.selectorStart + "restore-button").is(":hidden")).to.be.true;
      });

      it("should call notification.remove()", function() {
        const removeSpy = sandbox.spy(view.notification, "remove");

        view.enhancer.restoreToOriginal();

        sinon.assert.calledOnce(removeSpy);
      });

      it("should call blur.remove()", function() {
        const removeSpy = sandbox.spy(view.blur, "remove");

        view.enhancer.restoreToOriginal();

        sinon.assert.calledOnce(removeSpy);
      });

      it("should call view.notification.removeInst()", function() {
        const notificationRemoveInstSpy = sandbox.spy(view.notification, "removeInst");

        view.enhancer.restoreToOriginal();

        sinon.assert.calledOnce(notificationRemoveInstSpy);
      });
    });

    it("should be able to call initialize for all activities", function() {
      const initializeColorSpy = sandbox.spy(view.color, "initialize");
      const initializeClickSpy = sandbox.spy(view.click, "initialize");
      const initializeMcSpy = sandbox.spy(view.mc, "initialize");
      const initializeClozeSpy = sandbox.spy(view.cloze, "initialize");

      view.activity = "color";

      view.enhancer.enhance();

      sinon.assert.calledOnce(initializeColorSpy);


      view.activity = "click";

      view.enhancer.enhance();

      sinon.assert.calledOnce(initializeClickSpy);


      view.activity = "mc";

      view.enhancer.enhance();

      sinon.assert.calledOnce(initializeMcSpy);


      view.activity = "cloze";

      view.enhancer.enhance();

      sinon.assert.calledOnce(initializeClozeSpy);
    });

    it("should call constructInstruction(), as showInst is enabled", function() {
      const constructInstructionSpy = sandbox.spy(view.enhancer, "constructInstruction");
      view.showInst = true;
      view.topic = "nouns";
      view.language = "ru";
      view.activity = "color";
      view.topics = {nouns: jsonDataNouns};

      view.enhancer.enhance();

      sinon.assert.calledOnce(constructInstructionSpy);
    });

    describe("constructInstruction", function() {
      it("should call notification.addInst(instruction, isAvoidable), as the instruction was found in topics", function() {
        const addInstSpy = sandbox.spy(view.notification, "addInst");
        view.topic = "nouns";
        view.language = "ru";
        view.activity = "color";
        view.topics = {nouns: jsonDataNouns};

        view.enhancer.constructInstruction();

        sinon.assert.calledOnce(addInstSpy);
        sinon.assert.calledWithExactly(addInstSpy,
          "In the text, VIEW shows you the <span class='colorize-style-nouns'>Russian nouns</span>.",
          true
        );
      });

      it("should call notification.addInst(instruction, isAvoidable), as the instruction text was not found in topics", function() {
        const addInstSpy = sandbox.spy(view.notification, "addInst");
        view.topic = "nouns";
        view.language = "ru";
        view.activity = "color";
        view.topics = {nouns: jsonDataNouns};

        const activities = view.topics[view.topic][view.language].activities;

        delete activities[view.activity].instruction.text;

        view.enhancer.constructInstruction();

        sinon.assert.calledOnce(addInstSpy);
        sinon.assert.calledWithExactly(addInstSpy,
          "The instruction for the topic " +
          "<span class='colorize-style-" + view.topic + "'>" + view.topic + "</span>" +
          " is missing!", false
        );
      });

      it("should not call notification.addInst(instruction, isAvoidable), as the instruction was not found in topics", function() {
        const addInstSpy = sandbox.spy(view.notification, "addInst");
        view.topic = "nouns";
        view.language = "ru";
        view.activity = "color";
        view.topics = {nouns: jsonDataNouns};

        const activities = view.topics[view.topic][view.language].activities;

        delete activities[view.activity].instruction;

        view.enhancer.constructInstruction();

        sinon.assert.notCalled(addInstSpy);
      });
    });

    it("should show the abort button", function() {
      $(view.toolbar.selectorStart + "abort-button").hide();

      view.enhancer.enhance();

      expect($(view.toolbar.selectorStart + "abort-button").is(":visible")).to.be.true;
    });

    it("should call createActivityData()", function() {
      const createActivityDataSpy = sandbox.spy(view.enhancer, "createActivityData");

      view.enhancer.enhance();

      sinon.assert.calledOnce(createActivityDataSpy);
    });

    it("should return the activity data", function() {
      const url = "some-url";
      const language = "ru";
      const topic = "nouns";
      const filter = "Pl";
      const activity = "color";

      const activityData = {
        url,
        language,
        topic,
        filter,
        activity,
        document: $("#wertiview-content").html()
      };

      view.url = url;
      view.language = language;
      view.topic = topic;
      view.filter = filter;
      view.activity = activity;

      const returnedActivityData = view.enhancer.createActivityData();

      expect(activityData).to.eql(returnedActivityData);
    });

    it("should call requestToSendActivityDataAndGetEnhancementMarkup(activityData)", function() {
      const requestToSendActivityDataAndGetEnhancementMarkupSpy =
        sandbox.spy(view.enhancer, "requestToSendActivityDataAndGetEnhancementMarkup");

      const url = "some-url";
      const language = "ru";
      const topic = "nouns";
      const filter = "Pl";
      const activity = "color";

      view.url = url;
      view.language = language;
      view.topic = topic;
      view.filter = filter;
      view.activity = activity;

      view.enhancer.enhance();

      sinon.assert.calledOnce(requestToSendActivityDataAndGetEnhancementMarkupSpy);
      sinon.assert.calledWithExactly(requestToSendActivityDataAndGetEnhancementMarkupSpy, {
        url: url,
        language: language,
        topic: topic,
        filter: filter,
        activity: activity,
        document: $("#wertiview-content").html()
      });
    });

    it("should send a request to send activity data and get enhancement markup", function() {
      const url = "some-url";
      const language = "ru";
      const topic = "nouns";
      const filter = "Pl";
      const activity = "color";

      const activityData = {
        url,
        language,
        topic,
        filter,
        activity,
        document: $("#wertiview-content").html()
      };

      view.enhancer.requestToSendActivityDataAndGetEnhancementMarkup(activityData);

      sinon.assert.calledOnce(chrome.runtime.sendMessage);
      sinon.assert.calledWith(chrome.runtime.sendMessage, {
        action: "sendActivityDataAndGetEnhancementMarkup",
        activityData: activityData,
        ajaxTimeout: 60000
      });
    });
  });

  describe("addEnhancementMarkup", function() {
    it("should call view.toolbar.hideAbortButton()", function() {
      const toolbarHideAbortButtonSpy = sandbox.spy(view.toolbar, "hideAbortButton");

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.called(toolbarHideAbortButtonSpy);
    });

    it("should call view.lib.getAndUpdateOriginalContent()", function() {
      const getAndUpdateOriginalContentStub = sandbox.spy(view.lib, "getAndUpdateOriginalContent");

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.calledOnce(getAndUpdateOriginalContentStub);
    });

    it("should call view.lib.createContentElement(enhancementMarkup)", function() {
      const createContentElementStub = sandbox.spy(view.lib, "createContentElement");

      const enhancementMarkup = $("p").html();

      view.enhancer.addEnhancementMarkup(enhancementMarkup);

      sinon.assert.calledOnce(createContentElementStub);
      sinon.assert.calledWithExactly(createContentElementStub, enhancementMarkup);
    });

    it("should have the enhancement markup in the expected location", function() {
      const enhancementMarkup = $("p").html();

      view.enhancer.addEnhancementMarkup(enhancementMarkup);

      expect($("#wertiview-content").html()).to.equal(enhancementMarkup);
    });

    it("should call selector.select(filter)", function() {
      const selectSpy = sandbox.spy(view.selector, "select");

      view.filter = "Pl";

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.calledOnce(selectSpy);
      sinon.assert.calledWithExactly(selectSpy, "Pl");
    });

    it("should call runActivity()", function() {
      const runActivitySpy = sandbox.spy(view.enhancer, "runActivity");

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.calledOnce(runActivitySpy);
    });

    describe("runActivity", function() {
      describe("color", function() {
        it("should call color.run(topic)", function() {
          const runSpy = sandbox.spy(view.color, "run");

          const topic = "nouns";

          view.topic = topic;
          view.activity = "color";

          view.enhancer.runActivity();

          sinon.assert.called(runSpy);
          sinon.assert.calledWithExactly(runSpy, topic);
        });

        it("should call notification.add(notice)", function() {
          const addSpy = sandbox.spy(view.notification, "add");

          view.topic = "nouns";
          view.activity = "color";

          view.enhancer.runActivity();

          sinon.assert.calledOnce(addSpy);
          sinon.assert.calledWithExactly(addSpy, "VIEW Colorize Activity Ready");
        });
      });

      describe("click", function() {
        it("should call lib.disableAnchors()", function() {
          const disableAnchorsSpy = sandbox.spy(view.lib, "disableAnchors");

          view.topic = "nouns";
          view.activity = "click";

          view.enhancer.runActivity();

          sinon.assert.called(disableAnchorsSpy);
        });

        it("should call click.run()", function() {
          const runSpy = sandbox.spy(view.click, "run");

          view.topic = "nouns";
          view.activity = "click";

          view.enhancer.runActivity();

          sinon.assert.called(runSpy);
        });

        it("should call notification.add(notice)", function() {
          const addSpy = sandbox.spy(view.notification, "add");

          view.topic = "nouns";
          view.activity = "click";

          view.enhancer.runActivity();

          sinon.assert.calledOnce(addSpy);
          sinon.assert.calledWithExactly(addSpy, "VIEW Click Activity Ready");
        });
      });

      describe("mc", function() {
        it("should call lib.disableAnchors()", function() {
          const disableAnchorsSpy = sandbox.spy(view.lib, "disableAnchors");

          view.topic = "nouns";
          view.activity = "mc";

          view.enhancer.runActivity();

          sinon.assert.called(disableAnchorsSpy);
        });

        it("should call mc.run()", function() {
          const runSpy = sandbox.spy(view.mc, "run");

          view.topic = "nouns";
          view.activity = "mc";

          view.enhancer.runActivity();

          sinon.assert.called(runSpy);
        });

        it("should call notification.add(notice)", function() {
          const addSpy = sandbox.spy(view.notification, "add");

          view.topic = "nouns";
          view.activity = "mc";

          view.enhancer.runActivity();

          sinon.assert.calledOnce(addSpy);
          sinon.assert.calledWithExactly(addSpy, "VIEW Multiple Choice Activity Ready");
        });
      });

      describe("cloze", function() {
        it("should call lib.disableAnchors()", function() {
          const disableAnchorsSpy = sandbox.spy(view.lib, "disableAnchors");

          view.topic = "nouns";
          view.activity = "cloze";

          view.enhancer.runActivity();

          sinon.assert.called(disableAnchorsSpy);
        });

        it("should call cloze.run()", function() {
          const runSpy = sandbox.spy(view.cloze, "run");

          view.topic = "nouns";
          view.activity = "cloze";

          view.enhancer.runActivity();

          sinon.assert.called(runSpy);
        });

        it("should call notification.add(notice)", function() {
          const addSpy = sandbox.spy(view.notification, "add");

          view.topic = "nouns";
          view.activity = "cloze";

          view.enhancer.runActivity();

          sinon.assert.calledOnce(addSpy);
          sinon.assert.calledWithExactly(addSpy, "VIEW Practice Activity Ready");
        });

        it("should call blur.remove()", function() {
          const removeSpy = sandbox.spy(view.blur, "remove");

          view.topic = "nouns";
          view.activity = "cloze";

          view.enhancer.runActivity();

          sinon.assert.calledOnce(removeSpy);
        });
      });

      describe("default", function() {
        it("should call notification.add(notice)", function() {
          const addSpy = sandbox.spy(view.notification, "add");

          const activity = "unknown";

          view.topic = "nouns";
          view.activity = activity;

          view.enhancer.runActivity();

          sinon.assert.calledOnce(addSpy);
          sinon.assert.calledWithExactly(addSpy,
            "The activity '" + activity + "' is not implemented!"
          );
        });
      });
    });

    it("should call view.toolbar.initialInteractionState()", function() {
      const toolbarInitialInteractionStateSpy = sandbox.spy(view.toolbar, "initialInteractionState");

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.calledOnce(toolbarInitialInteractionStateSpy);
    });

    it("should show the restore button", function() {
      $(view.toolbar.selectorStart + "restore-button").hide();

      view.enhancer.addEnhancementMarkup($("p").html());

      expect($(view.toolbar.selectorStart + "restore-button").is(":visible")).to.be.true;
    });

    it("should set 'isAborted' to false as the enhancement was aborted", function() {

      view.enhancer.abort();

      view.enhancer.addEnhancementMarkup($("p").html());

      expect(view.enhancer.isAborted).to.be.false;
    });

    it("should call loadDebuggingOptions()", function() {
      const loadDebuggingOptionsSpy = sandbox.spy(view.enhancer, "loadDebuggingOptions");

      view.enhancer.addEnhancementMarkup($("p").html());

      sinon.assert.calledOnce(loadDebuggingOptionsSpy);
    });

    describe("loadDebuggingOptions", function() {
      it("should have sentences with red font", function() {
        view.debugSentenceMarkup = true;

        view.enhancer.loadDebuggingOptions();

        expect($("sentence").css("color")).to.equal("rgb(255, 0, 0)");
      });

      it("should have sentences including anchors with red font", function() {
        view.debugSentenceMarkup = true;

        view.enhancer.loadDebuggingOptions();

        expect($("sentence a").css("color")).to.equal("rgb(255, 0, 0)");
      });

      it("should have inferred sentences with greenyellow background", function() {
        view.debugSentenceMarkup = true;

        view.enhancer.loadDebuggingOptions();

        expect($("sentence[data-isbasedonblock]").css("background-color")).to.equal("rgb(173, 255, 47)");
      });

      it("should have nested sentences with a 1px thick solid black border", function() {
        view.debugSentenceMarkup = true;

        view.enhancer.loadDebuggingOptions();

        const $NestedSentence = $("sentence sentence");

        expect($NestedSentence.css("border-top-width")).to.equal("1px");
        expect($NestedSentence.css("border-top-style")).to.equal("solid");
        expect($NestedSentence.css("border-top-color")).to.equal("rgb(0, 0, 0)");
      });
    });
  });

  describe("abort", function() {
    it("should call view.toolbar.initialInteractionState()", function() {
      const toolbarInitialInteractionStateSpy = sandbox.spy(view.toolbar, "initialInteractionState");

      view.enhancer.abort();

      sinon.assert.called(toolbarInitialInteractionStateSpy);
    });

    it("should set 'isAborted' to true", function() {
      view.enhancer.abort();

      expect(view.enhancer.isAborted).to.be.true;
    });
  });
});
