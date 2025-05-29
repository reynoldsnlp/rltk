const $ = require('jquery');
const statisticsMenuContent = require('../html/statistics-menu.html');

module.exports = function(view) {
  return {
    selectorStart: "#view-statistics-menu-",

    /**
     * Add the statistics menu to the page.
     */
    add: function() {
      const $StatisticsMenu = $('<div>');
      $StatisticsMenu.attr("id", "view-statistics-menu-container");
      $StatisticsMenu.append(statisticsMenuContent);
      $('body').append($StatisticsMenu);
      view.statisticsMenu.init();
    },

    /**
     * Init the handlers for the statistics menu.
     */
    init: function() {
      view.statisticsMenu.initRequestAllTasks();
      view.statisticsMenu.initRequestLatestTask();
    },

    /**
     * Request all tasks when in the statistics menu "All Tasks" was clicked.
     */
    initRequestAllTasks: function() {
      $(view.statisticsMenu.selectorStart + "all-tasks").on(
        "click",
        view.statisticsMenu.requestToGetAllTasks
      );
    },

    /**
     * Send a request to the background script to get all tasks.
     */
    requestToGetAllTasks: function() {
      return view.getToken().then(
        token => chrome.runtime.sendMessage({
          action: "getAllTasks",
          ajaxTimeout: view.ajaxTimeout,
          serverTaskURL: view.serverTaskURL,
          queryParam: "?token=" + token
        })
      );
    },

    /**
     * Request the latest task when in the statistics menu "Latest Task" was clicked.
     */
    initRequestLatestTask: function() {
      $(view.statisticsMenu.selectorStart + "latest-task").on("click", function() {
        view.statisticsMenu.requestToGetTask(view.taskId);
      });
    },

    /**
     * Send a request to the background script to get the task with
     * given task id.
     */
    requestToGetTask: function(taskId) {
      return view.getToken().then(
        token => chrome.runtime.sendMessage({
          action: "getTask",
          ajaxTimeout: view.ajaxTimeout,
          serverTrackingURL: view.serverTrackingURL,
          queryParam: "?token=" + token + "&taskId=" + taskId
        })
      );
    },

    /**
     * Toggle the statistics menu.
     * Verify the latest task option.
     */
    toggle: function() {
      view.statisticsMenu.verifyLatestTask();

      $(view.statisticsMenu.selectorStart + "content").toggle();
    },

    /**
     * Verify whether the latest task option can be selected.
     * If so, show the option, otherwise hide it.
     */
    verifyLatestTask: function() {
      const $LatestTask = $(view.statisticsMenu.selectorStart + "latest-task");

      if (!view.taskId) {
        $LatestTask.hide();
      }
      else {
        $LatestTask.show();
      }
    },

    /**
     * Hide the statistics menu.
     */
    hide: function() {
      $(view.statisticsMenu.selectorStart + "content").hide();
    },

    /**
     * Show the statistics for all tasks.
     */
    showAllTasks: function(tasksData) {
      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-all-tasks-dialog");

      $.each(tasksData, function(index) {
        const taskData = tasksData[index];

        view.statisticsMenu.addTaskData($Dialog, taskData);
      });

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
        },
        buttons: {
          Ok: function() {
            view.lib.removeDialog($Dialog);
          }
        }
      };

      view.lib.dialogSetup($Dialog, settings);

      view.lib.initDialogClose($Dialog);
    },

    /**
     * Add task data to the dialog.
     *
     * @param {Object} $Dialog the dialog the task data is added to
     * @param {Array} taskData the task data to add
     */
    addTaskData: function($Dialog, taskData) {
      const taskId = taskData["task-id"];
      const viewTaskId = "view-task-" + taskId;

      const $TaskDiv = $("<div>");
      $TaskDiv.attr("id", viewTaskId);

      const $TaskBtn = view.lib.createButton(
        viewTaskId + "-btn",
        "view-task-btn",
        "Task " + taskId
      );

      const $PerformancesBtn = view.lib.createButton(
        "view-performances-of-task-" + taskId + "-btn",
        "view-performances-btn",
        "Performances"
      );

      $PerformancesBtn.hide();

      const $Webpage = $("<a>");
      $Webpage.attr("href", taskData["url"]);
      $Webpage.attr("target", "_blank");
      $Webpage.css("color", "blue");
      $Webpage.text(taskData["title"]);

      const $InfoList = view.lib.createList(viewTaskId + "-info", [
        "Webpage: " + $Webpage.prop("outerHTML"),
        "Language: " + taskData["language"],
        "Topic: " + taskData["topic"],
        "Filter: " + taskData["filter"],
        "Activity: " + taskData["activity"],
        "Number of exercises: " + taskData["number-of-exercises"]
      ]);

      $InfoList.hide();

      $TaskDiv.append($TaskBtn);

      $TaskDiv.append($PerformancesBtn);

      $TaskDiv.append($InfoList);

      $Dialog.append($TaskDiv);

      view.statisticsMenu.initTaskBtn(
        $TaskBtn,
        $InfoList,
        $PerformancesBtn
      );

      view.statisticsMenu.initPerformancesBtn(
        $PerformancesBtn,
        taskId
      );
    },

    /**
     * Init the given task button with a click event.
     *
     * @param {Object} $TaskBtn the button to initiate
     * @param {Object} $InfoList the list element to toggle on click
     * @param {Object} $PerformancesBtn the button to toggle on click
     */
    initTaskBtn: function($TaskBtn, $InfoList, $PerformancesBtn) {
      $TaskBtn.on("click", function() {
        $InfoList.toggle();
        $PerformancesBtn.toggle();
      });
    },

    /**
     * Init the given performances button with a click event.
     *
     * @param {Object} $PerformancesBtn the button to initiate
     * @param {number} taskId the task id used to request a task on click
     */
    initPerformancesBtn: function($PerformancesBtn, taskId) {
      $PerformancesBtn.on("click", function() {
        view.statisticsMenu.requestToGetTask(taskId);
      });
    },

    /**
     * Show the statistics for a task.
     */
    showTask: function(performancesData) {
      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-task-dialog");

      $.each(performancesData, function(index) {
        const performanceData = performancesData[index];

        view.statisticsMenu.addPerformanceData($Dialog, performanceData, index);
      });

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
        },
        buttons: {
          Ok: function() {
            view.lib.removeDialog($Dialog);
          }
        }
      };

      view.lib.dialogSetup($Dialog, settings);

      view.lib.initDialogClose($Dialog);
    },

    /**
     * Add performance data to the given dialog using the performance
     * data and index.
     *
     * @param {Object} $Dialog the dialog the task data is added to
     * @param {Array} performanceData the performance data to add
     * @param index the index the performance data can be found at
     */
    addPerformanceData: function($Dialog, performanceData, index) {
      const performanceId = index + 1;
      const enhancementId = performanceData["enhancement-id"];

      const $PerformanceDiv = $("<div>");
      $PerformanceDiv.attr("id", enhancementId + "-performance");

      const $PerformanceBtn = view.lib.createButton(
        enhancementId + "-btn",
        "view-performance-btn",
        "Performance " + performanceId
      );

      const $Sentence = $("<sentence>").html(performanceData["sentence"]);
      $Sentence.find("viewenhancement").addClass("view-enhancement-info-style");

      const $InfoList = view.lib.createList(enhancementId + "-info", [
        "Sentence: " + $Sentence.html(),
        "Correct answer: " + performanceData["correct-answer"],
        "Number of tries: " + performanceData["number-of-tries"],
        "Used solution: " + performanceData["used-solution"],
        "Assessment: " + view.assessment[performanceData["assessment"]]
      ]);

      $InfoList.hide();

      $PerformanceDiv.append($PerformanceBtn);

      $PerformanceDiv.append($InfoList);

      $Dialog.append($PerformanceDiv);

      view.statisticsMenu.initPerformanceBtn($PerformanceBtn, $InfoList);
    },

    /**
     * Init the given performance button with a click event.
     *
     * @param $PerformanceBtn the button element to initialize
     * @param $InfoList the list element to toggle on click
     */
    initPerformanceBtn: function($PerformanceBtn, $InfoList) {
      $PerformanceBtn.on("click", function() {
        $InfoList.toggle();
      });
    }
  };
};
