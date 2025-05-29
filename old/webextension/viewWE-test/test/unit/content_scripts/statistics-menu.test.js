/**
 * Tests for the statistics-menu.js file of the VIEW add-on.
 *
 * Created by eduard on 05.04.17.
 */

"use strict";

import $ from 'jquery';
import chrome from 'sinon-chrome';
import view from '../../../../viewWE/content_scripts/js/view.js';
import unitTest from '../unit-test.js';

describe("statistics-menu.js", function() {
  let sandbox;
  const tasksData = [
    {
      "user-id": "useruid",
      "task-id": 4,
      "url": "http://example.com",
      "title": "The <title> of the web page",
      "topic": "determiners",
      "activity": "click",
      "language": "en",
      "filter": "no-filter",
      "timestamp": 1490997600000,
      "number-of-exercises": 23
    },
    {
      "user-id": "useruid",
      "task-id": 5,
      "url": "http://example.com",
      "title": "The <title> of the web page",
      "topic": "determiners",
      "activity": "click",
      "language": "en",
      "filter": "no-filter",
      "timestamp": 1490997600000,
      "number-of-exercises": 23
    }
  ];

  const performancesData = [
    {
      "enhancement-id": "bar",
      "task-id": 1,
      "correct-answer": "submission",
      "number-of-tries": 1,
      "used-solution": false,
      "sentence": "the context sentence in which the <viewenhancement>enhancement</viewenhancement> is placed",
      "assessment": "EXACT_MATCH"
    },
    {
      "enhancement-id": "foo",
      "task-id": 1,
      "correct-answer": "submission",
      "number-of-tries": 2,
      "used-solution": false,
      "sentence": "the context sentence in which the <viewenhancement>enhancement</viewenhancement> is placed",
      "assessment": "EXACT_MATCH"
    }
  ];

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fixture.load("/viewWE-test/fixtures/statistics-menu.html");
    sandbox.stub($.fn, "load").yields();
    unitTest.setViewDefaults();
    window.chrome = chrome;
  });

  afterEach(function() {
    sandbox.restore();
    chrome.runtime.sendMessage.reset();
    fixture.cleanup();
    $("#view-all-tasks-dialog").remove();
    $("#view-task-dialog").remove();
  });

  describe("jquery selectors", function() {
    it("should be able to find all required jquery selectors in the statistics menu", function() {
      // some selectors only need the element, its enough if they exist
      // some selectors need the val(), text() or attr("link"),
      // if there is the value we expect, they exist as well
      // maintain this test, if there are additions or changes
      // the expectations below don't need to be tested in other tests again
      // the selectors below can be freely used in the tests without problems

      expect($(view.statisticsMenu.selectorStart + "content").length).to.be.above(0);
      expect($(view.statisticsMenu.selectorStart + "all-tasks").length).to.be.above(0);
      expect($(view.statisticsMenu.selectorStart + "latest-task").length).to.be.above(0);
    });
  });

  describe("add", function() {
    it("should call init()", function() {
      const initSpy = sandbox.spy(view.statisticsMenu, "init");

      view.statisticsMenu.add();

      sinon.assert.calledOnce(initSpy);
    });

    it("should call append(statisticMenu)", function() {
      const selectorSpy = sandbox.spy($.fn, "find");
      const appendSpy = sandbox.spy($.fn, "append");

      view.statisticsMenu.add();

      sinon.assert.calledOnce(selectorSpy);
      sinon.assert.calledWithExactly(selectorSpy, "body");

      // once for statisticsMenuContent, and once to append container to body
      sinon.assert.calledTwice(appendSpy);
    });

    describe("init", function() {
      it("should call initRequestAllTasks()", function() {
        const initRequestAllTasksSpy = sandbox.spy(
          view.statisticsMenu,
          "initRequestAllTasks"
        );

        view.statisticsMenu.init();

        sinon.assert.calledOnce(initRequestAllTasksSpy);
      });

      describe("initRequestAllTasks", function() {
        it("should initialize the show all tasks handler", function() {
          const selectorSpy = sandbox.spy(document, "getElementById");
          const eventSpy = sandbox.spy($.fn, "on");

          view.statisticsMenu.initRequestAllTasks();

          sinon.assert.calledOnce(selectorSpy);
          sinon.assert.calledWithExactly(selectorSpy,
            view.statisticsMenu.selectorStart.substr(1) + "all-tasks");

          sinon.assert.calledOnce(eventSpy);
          sinon.assert.calledWith(eventSpy, "click");
        });

        it("should call requestToGetAllTasks() on click", function() {
          const requestToGetAllTasksSpy = sandbox.spy(
            view.statisticsMenu,
            "requestToGetAllTasks"
          );

          view.statisticsMenu.initRequestAllTasks();

          $(view.statisticsMenu.selectorStart + "all-tasks").trigger("click");

          sinon.assert.calledOnce(requestToGetAllTasksSpy);
        });

        it("should send a request to get all tasks", function() {
          const token = "token";

          sandbox.stub(view, "getToken").resolves(token);

          return view.statisticsMenu.requestToGetAllTasks()
            .then(() => {
              sinon.assert.calledWith(chrome.runtime.sendMessage, {
                action: "getAllTasks",
                ajaxTimeout: 60000,
                serverTaskURL: "https://view.byu.edu/act/task",
                queryParam: "?token=" + token
              });
            });
        });
      });

      it("should call initRequestLatestTask()", function() {
        const initRequestLatestTaskSpy = sandbox.spy(
          view.statisticsMenu,
          "initRequestLatestTask"
        );

        view.statisticsMenu.init();

        sinon.assert.calledOnce(initRequestLatestTaskSpy);
      });

      describe("initRequestLatestTask", function() {
        it("should initialize the show latest task handler", function() {
          const selectorSpy = sandbox.spy(document, "getElementById");
          const eventSpy = sandbox.spy($.fn, "on");

          view.statisticsMenu.initRequestLatestTask();

          sinon.assert.calledOnce(selectorSpy);
          sinon.assert.calledWithExactly(selectorSpy,
            view.statisticsMenu.selectorStart.substr(1) + "latest-task");

          sinon.assert.calledOnce(eventSpy);
          sinon.assert.calledWith(eventSpy, "click");
        });

        it("should call requestToGetTask(taskId) on click", function() {
          const requestToGetTaskSpy = sandbox.spy(
            view.statisticsMenu,
            "requestToGetTask"
          );

          view.taskId = 3;

          view.statisticsMenu.initRequestLatestTask();

          $(view.statisticsMenu.selectorStart + "latest-task").trigger("click");

          sinon.assert.calledOnce(requestToGetTaskSpy);
          sinon.assert.calledWithExactly(requestToGetTaskSpy, 3);
        });

        it("should send a request to get the given task", function() {
          const token = "token";

          sandbox.stub(view, "getToken").resolves(token);

          const taskId = 3;

          return view.statisticsMenu.requestToGetTask(taskId)
            .then(() => {
              sinon.assert.calledWith(chrome.runtime.sendMessage, {
                action: "getTask",
                ajaxTimeout: 60000,
                serverTrackingURL: "https://view.byu.edu/act/tracking",
                queryParam: "?token=" + token + "&taskId=" + taskId
              });
            });
        });
      });
    });

    describe("toggle", function() {
      it("should call verifyLatestTask()", function() {
        const verifyLatestTaskSpy = sandbox.spy(view.statisticsMenu, "verifyLatestTask");

        view.statisticsMenu.toggle();

        sinon.assert.calledOnce(verifyLatestTaskSpy);
      });

      describe("verifyLatestTask", function() {
        it("should hide the latest task option, as there is no task id", function() {
          view.taskId = "";

          $(view.statisticsMenu.selectorStart + "latest-task").show();

          view.statisticsMenu.verifyLatestTask();

          expect($(view.statisticsMenu.selectorStart + "latest-task").is(":hidden")).to.be.true;
        });

        it("should show the latest task option, as there is a task id", function() {
          view.taskId = 3;

          $(view.statisticsMenu.selectorStart + "latest-task").hide();

          view.statisticsMenu.verifyLatestTask();

          expect($(view.statisticsMenu.selectorStart + "latest-task").is(":visible")).to.be.true;
        });
      });

      it("should toggle the statistics menu", function() {
        $(view.statisticsMenu.selectorStart + "content").hide();

        view.statisticsMenu.toggle();

        expect($(view.statisticsMenu.selectorStart + "content").is(":visible")).to.be.true;

        view.statisticsMenu.toggle();

        expect($(view.statisticsMenu.selectorStart + "content").is(":hidden")).to.be.true;
      });
    });

    describe("hide", function() {
      it("should hide the statistics menu", function() {
        $(view.statisticsMenu.selectorStart + "content").show();

        view.statisticsMenu.hide();

        expect($(view.statisticsMenu.selectorStart + "content").is(":hidden")).to.be.true;
      });
    });

    describe("showAllTasks", function() {
      it("should call addTaskData($Dialog, taskData) twice", function() {
        const addTaskDataSpy = sandbox.spy(view.statisticsMenu, "addTaskData");

        view.statisticsMenu.showAllTasks(tasksData);

        sinon.assert.calledTwice(addTaskDataSpy);

        $.each(tasksData, function(index) {
          const taskData = tasksData[index];

          expect(addTaskDataSpy.getCall(index).args[1]).to.equal(taskData);
        });

        sinon.assert.calledWith(addTaskDataSpy.getCall(1),
          $("#view-all-tasks-dialog")
        );
      });

      describe("addTaskData", function() {
        it("should call lib.createButton(id, class, text) to create the task button", function() {
          const createButtonSpy = sandbox.spy(view.lib, "createButton");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

          sinon.assert.called(createButtonSpy);
          sinon.assert.calledWithExactly(createButtonSpy.getCall(0),
            "view-task-4-btn",
            "view-task-btn",
            "Task 4"
          );
        });

        it("should call lib.createButton(id, class, text) to create the performances button", function() {
          const createButtonSpy = sandbox.spy(view.lib, "createButton");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

          sinon.assert.called(createButtonSpy);
          sinon.assert.calledWithExactly(createButtonSpy.getCall(1),
            "view-performances-of-task-4-btn",
            "view-performances-btn",
            "Performances"
          );
        });

        it("should hide the performances button", function() {
          const createButtonSpy = sandbox.spy(view.lib, "createButton");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

          expect(createButtonSpy.getCall(1).returnValue.is(":hidden")).to.be.true;
        });

        it("should call lib.createList(id, items) to create the info list", function() {
          const createListSpy = sandbox.spy(view.lib, "createList");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          const $Webpage = $("<a>");
          $Webpage.attr("href", taskData["url"]);
          $Webpage.attr("target", "_blank");
          $Webpage.css("color", "blue");
          $Webpage.text(taskData["title"]);

          view.statisticsMenu.addTaskData($Dialog, taskData);

          sinon.assert.calledOnce(createListSpy);
          sinon.assert.calledWithExactly(createListSpy,
            "view-task-4-info",
            [
              "Webpage: " + $Webpage.prop("outerHTML"),
              "Language: " + taskData["language"],
              "Topic: " + taskData["topic"],
              "Filter: " + taskData["filter"],
              "Activity: " + taskData["activity"],
              "Number of exercises: " + taskData["number-of-exercises"]
            ]
          );
        });

        it("should hide the info list", function() {
          const createListSpy = sandbox.spy(view.lib, "createList");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          view.statisticsMenu.addTaskData($Dialog, taskData);

          expect(createListSpy.getCall(0).returnValue.is(":hidden")).to.be.true;
        });

        it("should find the expected div element inside the dialog", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          view.statisticsMenu.addTaskData($Dialog, taskData);

          expect($Dialog.find("#view-task-4").length).to.be.above(0);
        });

        it("should find the task button inside the div element", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          view.statisticsMenu.addTaskData($Dialog, taskData);

          $("body").append($Dialog);

          expect($("#view-task-4").find("#view-task-4-btn").length).to.be.above(0);
        });

        it("should find the performances button inside the div element", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          view.statisticsMenu.addTaskData($Dialog, taskData);

          $("body").append($Dialog);

          expect($("#view-task-4").find("#view-performances-of-task-4-btn").length)
          .to.be.above(0);
        });

        it("should find the info list inside the div element", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          const taskData = tasksData[0];

          view.statisticsMenu.addTaskData($Dialog, taskData);

          $("body").append($Dialog);

          expect($("#view-task-4").find("#view-task-4-info").length).to.be.above(0);
        });

        it("should call initTaskBtn($TaskBtn, $InfoList, $PerformancesBtn)", function() {
          const initTaskBtnSpy = sandbox.spy(view.statisticsMenu, "initTaskBtn");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

          $("body").append($Dialog);

          sinon.assert.called(initTaskBtnSpy);
          sinon.assert.calledWithExactly(initTaskBtnSpy,
            $("#view-task-4-btn"),
            $("#view-task-4-info"),
            $("#view-performances-of-task-4-btn")
          );
        });

        describe("initTaskBtn", function() {
          it("should init the task button with a click handler", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-all-tasks-dialog");

            view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

            $("body").append($Dialog);

            const eventSpy = sandbox.spy($.fn, "on");

            view.statisticsMenu.initTaskBtn(
              $("#view-task-4-btn"),
              $("#view-task-4-info"),
              $("#view-performances-of-task-4-btn")
            );

            sinon.assert.calledOnce(eventSpy);
            sinon.assert.calledWith(eventSpy, "click");
          });

          it("should toggle the info list on click", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-all-tasks-dialog");

            view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

            $("body").append($Dialog);

            const $TaskBtn = $("#view-task-4-btn");
            const infoListSelector = "#view-task-4-info";

            $(infoListSelector).show();

            $TaskBtn.trigger("click");

            expect($(infoListSelector).is(":hidden")).to.be.true;

            $TaskBtn.trigger("click");

            expect($(infoListSelector).is(":visible")).to.be.true;
          });

          it("should toggle the performances button on click", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-all-tasks-dialog");

            view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

            $("body").append($Dialog);

            const $TaskBtn = $("#view-task-4-btn");
            const performancesBtnSelector = "#view-performances-of-task-4-btn";

            $(performancesBtnSelector).show();

            $TaskBtn.trigger("click");

            expect($(performancesBtnSelector).is(":hidden")).to.be.true;

            $TaskBtn.trigger("click");

            expect($(performancesBtnSelector).is(":visible")).to.be.true;
          });
        });

        it("should call initPerformancesBtn($PerformancesBtn, taskId)", function() {
          const initPerformancesBtnSpy = sandbox.spy(view.statisticsMenu, "initPerformancesBtn");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-all-tasks-dialog");

          view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

          $("body").append($Dialog);

          sinon.assert.called(initPerformancesBtnSpy);
          sinon.assert.calledWithExactly(initPerformancesBtnSpy,
            $("#view-performances-of-task-4-btn"),
            4
          );
        });

        describe("initPerformancesBtn", function() {
          it("should init the performances button with a click handler", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-all-tasks-dialog");

            view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

            $("body").append($Dialog);

            const eventSpy = sandbox.spy($.fn, "on");

            view.statisticsMenu.initPerformancesBtn(
              $("#view-performances-of-task-4-btn"),
              4
            );

            sinon.assert.calledOnce(eventSpy);
            sinon.assert.calledWith(eventSpy, "click");
          });

          it("should call requestToGetTask(taskId) on click", function() {
            const requestToGetTaskSpy = sandbox.spy(view.statisticsMenu, "requestToGetTask");

            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-all-tasks-dialog");

            view.statisticsMenu.addTaskData($Dialog, tasksData[0]);

            $("body").append($Dialog);

            $("#view-performances-of-task-4-btn").trigger("click");

            sinon.assert.calledOnce(requestToGetTaskSpy);
            sinon.assert.calledWith(requestToGetTaskSpy, 4);
          });
        });
      });

      it("should call lib.dialogSetup($Dialog, settings)", function() {
        const dialogSetupSpy = sandbox.spy(view.lib, "dialogSetup");

        const settings = {
          modal: true,
          title: "All Tasks",
          width: "auto",
          maxWidth: $(window).width() * 0.5,
          maxHeight: $(window).height() * 0.8,
          position: {
            my: "left",
            at: "left",
            of: window
          }
        };

        view.statisticsMenu.showAllTasks(tasksData);

        // the test fails with this property, probably because it has
        // an anonymous function
        delete dialogSetupSpy.firstCall.args[1].buttons;

        sinon.assert.calledOnce(dialogSetupSpy);
        sinon.assert.calledWith(dialogSetupSpy,
          $("#view-all-tasks-dialog"),
          settings
        );
      });

      it("should call removeDialog($Dialog) when the 'Ok' button was pressed", function() {
        const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

        let $Dialog = $("<div>");
        $Dialog.attr("id", "view-all-tasks-dialog");

        view.statisticsMenu.showAllTasks(performancesData);

        $Dialog = $("#view-all-tasks-dialog");

        // trigger a click on the 'Ok' button
        $Dialog.dialog("option", "buttons").Ok();

        sinon.assert.calledOnce(removeDialogSpy);
        sinon.assert.calledWith(removeDialogSpy, $Dialog);
      });

      it("should call lib.initDialogClose($Dialog)", function() {
        const initDialogCloseSpy = sandbox.spy(view.lib, "initDialogClose");

        view.statisticsMenu.showAllTasks(tasksData);

        sinon.assert.calledOnce(initDialogCloseSpy);
        sinon.assert.calledWithExactly(initDialogCloseSpy,
          $("#view-all-tasks-dialog")
        );
      });

      it("should find the all tasks dialog", function() {
        view.statisticsMenu.showAllTasks(tasksData);

        expect($("#view-all-tasks-dialog").length).to.be.above(0);
      });
    });

    describe("showTask", function() {
      it("should call addPerformanceData($Dialog, performanceData) twice", function() {
        const addPerformanceDataSpy = sandbox.spy(view.statisticsMenu, "addPerformanceData");

        view.statisticsMenu.showTask(performancesData);

        sinon.assert.calledTwice(addPerformanceDataSpy);

        $.each(performancesData, function(index) {
          const performanceData = performancesData[index];

          expect(addPerformanceDataSpy.getCall(index).args[1]).to.equal(performanceData);
        });

        sinon.assert.calledWith(addPerformanceDataSpy.getCall(1),
          $("#view-task-dialog")
        );
      });

      describe("addPerformanceData", function() {
        it("should call lib.createButton(id, class, text) to create the performance button", function() {
          const createButtonSpy = sandbox.spy(view.lib, "createButton");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          sinon.assert.called(createButtonSpy);
          sinon.assert.calledWithExactly(createButtonSpy,
            "bar-btn",
            "view-performance-btn",
            "Performance 1"
          );
        });

        it("should call lib.createList(id, items) to create the info list", function() {
          const createListSpy = sandbox.spy(view.lib, "createList");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          const performanceData = performancesData[0];
          const $Sentence = $("<sentence>").html(performanceData["sentence"]);
          $Sentence.find("viewenhancement").addClass("view-enhancement-info-style");

          view.statisticsMenu.addPerformanceData($Dialog, performanceData, 0);

          sinon.assert.calledOnce(createListSpy);
          sinon.assert.calledWithExactly(createListSpy,
            "bar-info",
            [
              "Sentence: " + $Sentence.html(),
              "Correct answer: " + performanceData["correct-answer"],
              "Number of tries: " + performanceData["number-of-tries"],
              "Used solution: " + performanceData["used-solution"],
              "Assessment: Perfect solution"
            ]
          );
        });

        it("should hide the info list", function() {
          const createListSpy = sandbox.spy(view.lib, "createList");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          expect(createListSpy.getCall(0).returnValue.is(":hidden")).to.be.true;
        });

        it("should find the expected div element inside the dialog", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          expect($Dialog.find("#bar-performance").length).to.be.above(0);
        });

        it("should find the performance button inside the div element", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          $("body").append($Dialog);

          expect($("#bar-performance").find("#bar-btn").length)
          .to.be.above(0);
        });

        it("should find the info list inside the div element", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          $("body").append($Dialog);

          expect($("#bar-performance").find("#bar-info").length).to.be.above(0);
        });

        it("should find the class 'view-enhancement-info-style' inside the info list", function() {
          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          $("body").append($Dialog);

          expect($("#bar-info").find(".view-enhancement-info-style").length).to.be.above(0);
        });

        it("should call initPerformanceBtn($PerformanceBtn, $InfoList)", function() {
          const initPerformanceBtnSpy = sandbox.spy(view.statisticsMenu, "initPerformanceBtn");

          const $Dialog = $("<div>");
          $Dialog.attr("id", "view-task-dialog");

          view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

          $("body").append($Dialog);

          sinon.assert.called(initPerformanceBtnSpy);
          sinon.assert.calledWithExactly(initPerformanceBtnSpy,
            $("#bar-btn"),
            $("#bar-info")
          );
        });

        describe("initPerformanceBtn", function() {
          it("should init the performance button with a click handler", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-task-dialog");

            view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

            $("body").append($Dialog);

            const eventSpy = sandbox.spy($.fn, "on");

            view.statisticsMenu.initPerformanceBtn(
              $("#bar-btn"),
              $("#bar-info")
            );

            sinon.assert.calledOnce(eventSpy);
            sinon.assert.calledWith(eventSpy, "click");
          });

          it("should toggle the info list on click", function() {
            const $Dialog = $("<div>");
            $Dialog.attr("id", "view-task-dialog");

            view.statisticsMenu.addPerformanceData($Dialog, performancesData[0], 0);

            $("body").append($Dialog);

            const $PerformanceBtn = $("#bar-btn");
            const infoListSelector = "#bar-info";

            $(infoListSelector).show();

            $PerformanceBtn.trigger("click");

            expect($(infoListSelector).is(":hidden")).to.be.true;

            $PerformanceBtn.trigger("click");

            expect($(infoListSelector).is(":visible")).to.be.true;
          });
        });
      });

      it("should call lib.dialogSetup($Dialog, settings)", function() {
        const dialogSetupSpy = sandbox.spy(view.lib, "dialogSetup");

        const settings = {
          modal: true,
          title: "Task Performances",
          width: "auto",
          maxWidth: $(window).width() * 0.5,
          maxHeight: $(window).height() * 0.8,
          position: {
            my: "left",
            at: "left",
            of: window
          }
        };

        view.statisticsMenu.showTask(performancesData);

        // the test fails with this property, probably because it has
        // an anonymous function
        delete dialogSetupSpy.firstCall.args[1].buttons;

        sinon.assert.calledOnce(dialogSetupSpy);
        sinon.assert.calledWith(dialogSetupSpy,
          $("#view-task-dialog"),
          settings
        );
      });

      it("should call removeDialog($Dialog) when the 'Ok' button was pressed", function() {
        const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

        let $Dialog = $("<div>");
        $Dialog.attr("id", "view-task-dialog");

        view.statisticsMenu.showTask(performancesData);

        $Dialog = $("#view-task-dialog");

        // trigger a click on the 'Ok' button
        $Dialog.dialog("option", "buttons").Ok();

        sinon.assert.calledOnce(removeDialogSpy);
        sinon.assert.calledWith(removeDialogSpy, $Dialog);
      });

      it("should call lib.initDialogClose($Dialog)", function() {
        const initDialogCloseSpy = sandbox.spy(view.lib, "initDialogClose");

        view.statisticsMenu.showTask(performancesData);

        sinon.assert.calledOnce(initDialogCloseSpy);
        sinon.assert.calledWithExactly(initDialogCloseSpy,
          $("#view-task-dialog")
        );
      });

      it("should find the task dialog", function() {
        view.statisticsMenu.showTask(performancesData);

        expect($("#view-task-dialog").length).to.be.above(0);
      });
    });
  });
});
