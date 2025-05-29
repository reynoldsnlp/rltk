import SelectorCache from '../SelectorCache.js';

const viewOptions = {
  $cache: new SelectorCache(),

  selectorStart: "#wertiview-",

  /**
   * Restore user options and initialize all options handler.
   */
  init: function() {
    viewOptions.initFixedNumberHandler();

    viewOptions.initPercentageHandler();

    viewOptions.initRandomChoiceHandler();

    viewOptions.initFirstOffsetChoiceHandler();

    viewOptions.initIntervalSizeChoiceHandler();

    viewOptions.initSaveOptionsHandler();

    viewOptions.restoreUserOptions();
  },

  /**
   * Initialize the handler for the fixed number of exercises.
   */
  initFixedNumberHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises").on("change",
      viewOptions.chooseFixedNumber);
  },

  /**
   * Will choose fixed number as how many exercises are chosen and will
   * hide the value for the percentage of exercises.
   */
  chooseFixedNumber: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises-value").show();
    viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises-value").hide();
  },

  /**
   * Initialize the handler for the percentage of exercises.
   */
  initPercentageHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises").on("change",
      viewOptions.choosePercentage);
  },

  /**
   * Will choose percentage as how many exercises are chosen and will
   * hide the value for the fixed number of exercises.
   */
  choosePercentage: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises-value").show();
    viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises-value").hide();
  },

  /**
   * Initialize the handler for the random choice of exercises.
   */
  initRandomChoiceHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "random").on("change",
      viewOptions.chooseRandom);
  },

  /**
   * Check the random choice on how exercises should be chosen.
   * Hide first offset and interval size values.
   */
  chooseRandom: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "first-offset-value").hide();
    viewOptions.$cache.get(viewOptions.selectorStart + "interval-size-value").hide();
  },

  /**
   * Initialize the handler for the first offset choice of exercises.
   */
  initFirstOffsetChoiceHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "first-offset").on("change",
      viewOptions.chooseFirstOffset);
  },

  /**
   * Check the first offset choice on how exercises should be chosen.
   * Show the value and hide the interval size value.
   */
  chooseFirstOffset: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "first-offset-value").show();
    viewOptions.$cache.get(viewOptions.selectorStart + "interval-size-value").hide();
  },

  /**
   * Initialize the handler for the interval size choice of exercises.
   */
  initIntervalSizeChoiceHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "interval-size").on("change",
      viewOptions.chooseIntervalSize);
  },

  /**
   * Check the interval size choice on how exercises should be chosen.
   * Show the value and hide the first offset value.
   */
  chooseIntervalSize: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "interval-size-value").show();
    viewOptions.$cache.get(viewOptions.selectorStart + "first-offset-value").hide();
  },

  /**
   * Initialize the handler for saving the user options.
   */
  initSaveOptionsHandler: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "save-options").on("click",
      viewOptions.saveUserOptions);
  },

  /**
   * Save all user option choices to the storage.
   */
  saveUserOptions: function() {
    const serverURL = viewOptions.$cache.get("input[name='server']:checked").val();
    const servletURL = serverURL + "/view";
    const serverTaskURL = serverURL + "/act/task";
    const serverTrackingURL = serverURL + "/act/tracking";
    const authenticator = serverURL + "/authenticator.html";
    chrome.storage.local.set({
      serverURL,
      servletURL,
      serverTaskURL,
      serverTrackingURL,
      authenticator,
      fixedOrPercentage: parseInt(viewOptions.$cache.get("input[name='fixedOrPercentage']:checked").val(), 10),
      fixedNumberOfExercises: parseInt(viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises-value").val(), 10),
      percentageOfExercises: parseInt(viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises-value").val(), 10),
      choiceMode: parseInt(viewOptions.$cache.get("input[name='choiceMode']:checked").val(), 10),
      firstOffset: parseInt(viewOptions.$cache.get(viewOptions.selectorStart + "first-offset-value").val(), 10),
      intervalSize: parseInt(viewOptions.$cache.get(viewOptions.selectorStart + "interval-size-value").val(), 10),
      showInst: viewOptions.$cache.get(viewOptions.selectorStart + "show-instructions").prop("checked"),
      debugSentenceMarkup: viewOptions.$cache.get(viewOptions.selectorStart + "debug-sentence-markup").prop("checked")
    }, viewOptions.showSavedMessage);
  },

  /**
   * When the options are saved, the user will see the message below the save
   * button for 5 seconds.
   */
  showSavedMessage: function() {
    viewOptions.$cache.get(viewOptions.selectorStart + "options-saved").show().delay(5000).fadeOut();
  },

  /**
   * Restore previous user option settings from storage.
   * The values right to "||" are default values.
   */
  restoreUserOptions: function() {
    chrome.storage.local.get([
      "serverURL",
      "fixedOrPercentage",
      "fixedNumberOfExercises",
      "percentageOfExercises",
      "choiceMode",
      "firstOffset",
      "intervalSize",
      "showInst",
      "debugSentenceMarkup"
    ], function(res) {
      const fixedOrPercentageValue = res.fixedOrPercentage || 0;
      const fixedNumberOfExercises = res.fixedNumberOfExercises || 25;
      const percentageOfExercises = res.percentageOfExercises || 100;
      const choiceModeValue = res.choiceMode || 0;
      const firstOffset = res.firstOffset || 0;
      const intervalSize = res.intervalSize || 1;
      const showInst = res.showInst || false;
      const debugSentenceMarkup = res.debugSentenceMarkup || false;
      const serverURL = res.serverURL || 'http://view.byu.edu';

      viewOptions.chooseHowManyExercises(fixedOrPercentageValue);

      viewOptions.restoreHowManyExercises(
        fixedNumberOfExercises,
        percentageOfExercises
      );

      viewOptions.chooseHowToChooseExercises(choiceModeValue);

      viewOptions.restoreHowToChooseExercises(
        firstOffset,
        intervalSize
      );

      viewOptions.restoreIfToShowInstructions(showInst);
      viewOptions.restoreDeveloperOptions(debugSentenceMarkup, serverURL);
    });
  },

  /**
   * Choice between a fixed number or percentage of exercises.
   *
   * @param {number} fixedOrPercentageValue 0 if fixed, percentage otherwise
   */
  chooseHowManyExercises: function(fixedOrPercentageValue) {
    if (fixedOrPercentageValue === 0) {
      viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises").prop("checked", true);
      viewOptions.chooseFixedNumber();
    } else {
      viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises").prop("checked", true);
      viewOptions.choosePercentage();
    }
  },

  /**
   * Restore the values of the fixed number and percentage of exercises.
   *
   * @param {number} fixedNumberOfExercises the number of exercises
   * @param {number} percentageOfExercises the percentage of exercises
   */
  restoreHowManyExercises: function(fixedNumberOfExercises, percentageOfExercises) {
    viewOptions.$cache.get(viewOptions.selectorStart + "fixed-number-of-exercises-value").val(fixedNumberOfExercises);

    viewOptions.$cache.get(viewOptions.selectorStart + "percentage-of-exercises-value").val(percentageOfExercises);

  },

  /**
   * Choice how exercises should be chosen.
   *
   * @param {number} choiceModeValue 0 if random, 1 if first offset, interval
   * size otherwise
   */
  chooseHowToChooseExercises: function(choiceModeValue) {
    if (choiceModeValue === 0) {
      viewOptions.$cache.get(viewOptions.selectorStart + "random").prop("checked", true);
      viewOptions.chooseRandom();
    } else if (choiceModeValue === 1) {
      viewOptions.$cache.get(viewOptions.selectorStart + "first-offset").prop("checked", true);
      viewOptions.chooseFirstOffset();
    } else {
      viewOptions.$cache.get(viewOptions.selectorStart + "interval-size").prop("checked", true);
      viewOptions.chooseIntervalSize();
    }
  },

  /**
   * Restore the values of the first offset and the interval size.
   *
   * @param {number} firstOffset the offset value
   * @param {number} intervalSize the interval value
   */
  restoreHowToChooseExercises: function(firstOffset, intervalSize) {
    viewOptions.$cache.get(viewOptions.selectorStart + "first-offset-value").val(firstOffset);

    viewOptions.$cache.get(viewOptions.selectorStart + "interval-size-value").val(intervalSize);
  },

  /**
   * Choice whether instructions should be showed or not
   *
   * @param {boolean} showInst true if to show instructions, false otherwise
   */
  restoreIfToShowInstructions: function(showInst) {
    viewOptions.$cache.get(viewOptions.selectorStart + "show-instructions").prop("checked", showInst);
  },

  /**
   * Restore developer options.
   *
   * @param {boolean} debugSentenceMarkup True iff the user selected to debug with sentences marked up
   * @param {string}  serverSelection     The server to communicate with
   */
  restoreDeveloperOptions: function(debugSentenceMarkup, serverSelection) {
    viewOptions.$cache.get(viewOptions.selectorStart + "debug-sentence-markup").prop("checked", debugSentenceMarkup);

    // We assume the ids of the radio <input> tags are the url with all slashes and initial https?: stripped.
    const httpAndSlashes = /(^https?:|\/|\.|:)/g;
    const selectionId = serverSelection.replace(httpAndSlashes, "");
    viewOptions.$cache.get("#" + selectionId).prop("checked", true);
  }
};

/**
 * Initialize the options when the document is ready.
 */
viewOptions.$cache.get(document).ready(function() {
  viewOptions.init();
});

export default viewOptions;
