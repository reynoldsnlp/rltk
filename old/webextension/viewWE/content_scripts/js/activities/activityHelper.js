const $ = require('jquery');
const assistiveReadingHTML = require('../../html/assistive-reading.html');

module.exports = function(view) {
  return {
    /**
     * Generate multiple choice or cloze exercises.
     *
     * @param {function} createExercise either the mc or cloze createExercise
     * function.
     */
    exerciseHandler: function(createExercise) {
      const hitList = view.activityHelper.createHitList();

      const numExercises = view.activityHelper.calculateNumberOfExercises(hitList);

      const exerciseOptions = view.activityHelper.chooseWhichExercises(hitList);

      view.activityHelper.createExercises(
        numExercises,
        exerciseOptions,
        hitList,
        createExercise
      );

      view.activityHelper.getNumberOfExercisesAndRequestTaskId(".viewinput");

      $("viewhint").on("click", view.activityHelper.hintHandler);
    },

    /**
     * Create a hit list from all enhancements.
     */
    createHitList: function() {
      const hitList = [];

      $("viewenhancement[data-type='hit'].selected").each(function() {
        hitList.push($(this));
      });

      return hitList;
    },

    /**
     * Calculate the number of hits to turn into exercises
     *
     * @param {Array} hitList list of hits that could be turned into exercises
     * @returns {number} the number of exercises
     */
    calculateNumberOfExercises: function(hitList) {
      if (view.fixedOrPercentage === 0) {
        return view.fixedNumberOfExercises;
      }
      else {
        return Math.round(view.percentageOfExercises / 100 * hitList.length);
      }
    },

    /**
     * Choose which hits to turn into exercises.
     *
     * @param {Array} hitList list of hits that could be turned into exercises
     * @returns {object} first offset and interval size values
     */
    chooseWhichExercises: function(hitList) {
      const choiceModeValue = view.choiceMode;

      const exercises = {};

      // defaults
      exercises.firstOffset = 0;
      exercises.intervalSize = 1;

      if (choiceModeValue === 0) {
        view.lib.shuffleList(hitList);
      }
      else if (choiceModeValue === 1) {
        exercises.firstOffset = view.firstOffset;
      }
      else {
        exercises.intervalSize = view.intervalSize;
      }

      return exercises;
    },

    /**
     * Create exercises for the activity.
     *
     * @param {number} numExercises the number of exercises
     * @param {object} exerciseOptions first offset and interval size values
     * @param {Array} hitList list of hits that could be turned into exercises
     * @param {function} createExercise the function to call to create an
     * exercise for the current activity
     */
    createExercises: function(numExercises, exerciseOptions, hitList, createExercise) {
      let exerciseNumber = exerciseOptions.firstOffset;

      for (; numExercises > 0 && exerciseNumber < hitList.length; exerciseNumber += exerciseOptions.intervalSize) {
        const $hit = hitList[exerciseNumber];
        createExercise($hit);
        numExercises--;
      }
    },

    /**
     * Use the selector to retrieve the number of exercises, save
     * the number and request the task id from the server.
     * The user has to be logged in.
     *
     * @param {string} selector the selector to get the length of
     */
    getNumberOfExercisesAndRequestTaskId: function(selector) {
      if (view.userid) {
        const numberOfExercises = $(selector).length;

        view.activityHelper.setNumberOfExercises(numberOfExercises);

        view.activityHelper.requestToSendTaskDataAndGetTaskId();
      }
    },

    /**
     * Set the number of exercises.
     *
     * @param {number} numberOfExercises the number of exercises
     */
    setNumberOfExercises: function(numberOfExercises) {
      chrome.storage.local.set({numberOfExercises: numberOfExercises});
    },

    /**
     * Send a request to the background script to send task data
     * and get the task id.
     */
    requestToSendTaskDataAndGetTaskId: function() {
      return view.activityHelper.createTaskData().then(
        taskData => {
          chrome.runtime.sendMessage({
            action: "sendTaskDataAndGetTaskId",
            taskData: taskData,
            serverTaskURL: view.serverTaskURL
          });
        }
      );
    },

    /**
     * Create task data to be sent to the server.
     *
     * @returns {object} the data of the latest task
     */
    createTaskData: async function() {
      return {
        token: await view.getToken(),
        url: view.url,
        title: view.title,
        language: view.language,
        topic: view.topic,
        filter: view.filter,
        activity: view.activity,
        timestamp: view.timestamp,
        "number-of-exercises": view.numberOfExercises
      };
    },

    /**
     * Deals with the hint in the mc and cloze activities.
     */
    hintHandler: function() {
      const timestamp = Date.now();
      view.activityHelper.setTimestamp(timestamp);

      const $ElementBox = $(this).prev();
      const $EnhancementElement = $ElementBox.parent();
      const submission = $ElementBox.val() || "no submission";
      const isCorrect = true;
      const usedSolution = true;

      view.activityHelper.processCorrect($ElementBox, "provided");

      view.tracker.trackData(
        $EnhancementElement,
        submission,
        isCorrect,
        usedSolution
      );
    },

    /**
     * Set the timestamp.
     *
     * @param {number} timestamp the time stamp
     */
    setTimestamp: function(timestamp) {
      chrome.storage.local.set({timestamp: timestamp});
    },

    /**
     * Deals with the submission in the mc and cloze activities.
     *
     * @param {object} e the triggered event
     */
    inputHandler: function(e) {
      const timestamp = Date.now();
      view.activityHelper.setTimestamp(timestamp);

      let isCorrect = false;
      const $ElementBox = $(e.target);
      const $EnhancementElement = $ElementBox.parent();
      const submission = $ElementBox.val();
      const usedSolution = false;

      if(submission){
        if (submission.toLowerCase() === $ElementBox.data("view-answer").toLowerCase()) {
          isCorrect = true;
          view.activityHelper.processCorrect($ElementBox, "correct");
        }
        else {
          view.activityHelper.processIncorrect($ElementBox);
        }

        view.tracker.trackData(
          $EnhancementElement,
          submission,
          isCorrect,
          usedSolution
        );
      }
    },

    /**
     * Process the correct submission.
     *
     * @param {object} $ElementBox the select or input box
     * @param {string} inputStyleType either "correct" or "provided"
     */
    processCorrect: function($ElementBox, inputStyleType) {
      const $EnhancementElement = $ElementBox.parent();
      const elementId = $(".viewinput").index($ElementBox);

      view.activityHelper.colorClue($EnhancementElement.data("clueid"), "inherit");

      $EnhancementElement.addClass("input-style-" + inputStyleType);
      $EnhancementElement.html($ElementBox.data("view-answer"));

      view.activityHelper.jumpTo(elementId);
    },

    /**
     * Color the clue accordingly.
     *
     * @param {string} clueId the id of the clue to be colored
     * @param {string} clueStyleColor the color to use, either "inherit" or "red"
     */
    colorClue: function(clueId, clueStyleColor) {
      $("#" + clueId).css("color", clueStyleColor);
    },

    /**
     * Jump to the element if it exists and to the first element otherwise.
     *
     * @param {number} elementId the element id we currently at
     */
    jumpTo: function(elementId) {
      const $ElementBoxes = $(".viewinput");
      const $Element = $ElementBoxes.eq(elementId);
      const $FirstElement = $ElementBoxes.eq(0);

      if ($Element.length) {
        view.activityHelper.scrollToCenter($Element);
      }
      else {
        view.activityHelper.scrollToCenter($FirstElement);
      }
    },

    /**
     * Scroll to the middle of the viewport relative to the element.
     *
     * @param $Element the element to focus and center onto
     */
    scrollToCenter: function($Element) {
      const $Window = $(window);

      $Element.focus();

      $Window.scrollTop($Element.offset().top - ($Window.height() / 2));
    },

    /**
     * Process the incorrect submission.
     *
     * @param {object} $ElementBox the select or input box
     */
    processIncorrect: function($ElementBox) {
      view.activityHelper.colorClue($ElementBox.parent().data("clueid"), "red");

      // turns all options, the topmost element after selection included, as red
      $ElementBox.addClass("input-style-incorrect");
      // remove assigned classes to all options from previous selections
      $ElementBox.find("option").removeAttr("class");
      // turn the selected option red
      $ElementBox.find("option:selected").addClass("input-style-incorrect");
      // turn the not selected options black
      $ElementBox.find("option:not(:selected)").addClass("input-style-neutral");
    },

    /**
     * Get the correct answer for the mc and cloze activities.
     *
     * @param {object} $hit the enhancement element
     * @param {number} capType the capitalization type of the original word
     */
    getCorrectAnswer: function($hit, capType) {
      const correctform = $hit.data("correctform");
      if($hit.data("phonetic-transcription") != null && $hit.data("phonetic-transcription").length > 0) {
        return view.lib.matchCapitalization($hit.data("phonetic-transcription"), capType);
      }
      else if (correctform) {
        return view.lib.matchCapitalization(correctform, capType);
      }
      else {
        return $hit.data("original-text");
      }
    },

    /**
     * Create the hint visible as "?".
     *
     * @param {object} $hit the enhancement element the select box is designed for
     */
    createHint: function($hit) {
      const $hint = $("<viewhint>");
      $hint.addClass("view-style-hint");
      $hint.text("?");
      $hit.append($hint);
    },

    /**
     * Create a legend for the colors
     */
    createColorLegend: function(filters) {
      const $ColorLegend = $("<div>");
      $ColorLegend.attr("id", "wertiview-color-legend");

      const $ColorLegendContents = $("<div>Color Legend</div>");
      $ColorLegendContents.addClass("color-legend-title");
      $ColorLegend.append($ColorLegendContents);

      filters.map((filterItem) => {
        var $ColorLegendContents = $("<div>");
        $ColorLegendContents.text(filterItem.filterName);
        $ColorLegendContents.addClass(filterItem.class + " color-legend-item");
        $ColorLegend.append($ColorLegendContents);
      })

      const $Body = $("body");
      $Body.append($ColorLegend);
    },

    /**
     * Remove the legend for the colors
     */
    removeColorLegend: function() {
      $("#wertiview-color-legend").remove();
    },

    /**
     * Create Assistive Reading Window
     */
    createAssistiveReadingContainer: function() {
      const $AssistiveReading = $("<div>");
      $AssistiveReading.attr("id", "view-assistive-reading-container");
      $AssistiveReading.html(assistiveReadingHTML);
      $AssistiveReading.css("height", "calc(100% - " + $("#wertiview-toolbar-container").outerHeight(true) + "px)");

      $("body").append($AssistiveReading);
      $("#wertiview-container").css('width', $(window).width() - $("#view-assistive-reading-container").outerWidth(true) + "px");
      $("#wertiview-container").css('left', $("#view-assistive-reading-container").outerWidth(true) + "px");
      $("#wertiview-container").css('position', "relative");
    },

    /**
     * Remove Assistive Reading Window
     */
    removeAssistiveReadingContainer: function() {
      $("#view-assistive-reading-container").remove();
      $("#wertiview-container").css('width', $(window).width());
      $("#wertiview-container").css('left', 0);
    }
  };
};
