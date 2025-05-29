const $ = require('jquery');

module.exports = function(view) {
  return {
    /**
     * The extension send the request to show the
     * feedback for the submission.
     *
     * @param {Object} submissionResponseData the response from the
     * server after tracking data was processed
     */
    showFeedback: function(submissionResponseData) {
      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-feedback-dialog");

      const performanceData = submissionResponseData.performance;
      const feedbackData = submissionResponseData.feedback;

      view.feedbacker.addSubmissionResponseData($Dialog, performanceData, feedbackData);

      const position = view.feedbacker.decideDialogPosition(performanceData["enhancement-id"]);

      const settings = {
        title: "Feedback (try " + performanceData["number-of-tries"] + ")",
        width: "auto",
        height: "auto",
        maxHeight: $(window).height() * 0.40,
        position: position
      };

      view.lib.dialogSetup($Dialog, settings);

      view.lib.initDialogClose($Dialog);

      view.feedbacker.initFeedbackRuleBtn(position);

      view.feedbacker.initFeedbackHintBtn(position);

      $("#feedback-hint-btn-1").show();
    },

    /**
     * Add performance and feedback data to the given dialog.
     * Add the assessment text of the first feedback hint.
     *
     * @param {Object} $Dialog the dialog the task data is added to
     * @param {Object} performanceData the performance data to add
     * @param {Object} feedbackData the feedback data to add
     */
    addSubmissionResponseData: function($Dialog, performanceData, feedbackData) {
      const enhancementId = performanceData["enhancement-id"];

      const $FeedbackMessage = $("<div>");
      $FeedbackMessage.attr("id", enhancementId + "-message");
      $FeedbackMessage.html(feedbackData["message"]);

      $FeedbackMessage.find("#feedback-hint-btn-1")
      .text(view.assessment[feedbackData["assessment"]]);

      $Dialog.append($FeedbackMessage);
    },

    /**
     * Decide the dialog position relative to the position of the
     * enhancement element:
     * - dialog is at the bottom, if the enhancement element is above
     * the center of the window
     * - dialog is at the top otherwise
     *
     * @param {number} enhancementId the id of the enhancement element
     * @returns {Object} the position of the dialog
     */
    decideDialogPosition: function(enhancementId) {
      const elementYPosition = $("#" + enhancementId).offset().top;
      const currentTop = $(window).scrollTop();
      const windowCenter = $(window).height() * 0.45;
      const centerYPosition = currentTop + windowCenter;

      if(elementYPosition < centerYPosition){
        return {
          my: "left bottom",
          at: "left top",
          of: "#wertiview-toolbar-container"
        };
      }
      else {
        return {
          my: "left top",
          at: "left top",
          of: window
        };
      }
    },

    /**
     * Initialize the click handler for the feedback rule button.
     *
     * @param {number} position the position of the feedback dialog
     */
    initFeedbackRuleBtn: function(position) {
      $("#feedback-rule-btn").on("click", function() {
        view.feedbacker.toggleFeedbackRule($(this), position);
      });
    },

    /**
     * Toggle the active class on the feedback rule button.
     * Toggle the feedback rule.
     * Scroll to the start of the shown rule.
     * Reposition the feedback dialog, because the height and width likely
     * changed.
     *
     * @param {Object} $Element the feedback rule button element
     * @param {number} position the position of the feedback dialog
     */
    toggleFeedbackRule: function($Element, position) {
      const $Dialog = $("#view-feedback-dialog");

      $Element.toggleClass("active");

      view.lib.toggleAndScrollToElement($("#feedback-rule"), $Dialog);

      view.lib.moveDialog($Dialog, position);
    },

    /**
     * Initialize the click handler for the feedback hint button.
     *
     * @param {number} position the position of the feedback dialog
     */
    initFeedbackHintBtn: function(position) {
      $(".feedback-hint-btn").on("click", function() {
        view.feedbacker.toggleHintAndShowNextHintBtn($(this), position);
      });
    },

    /**
     * Toggle the active class on the feedback hint button.
     * Toggle the feedback hint and show the next feedback hint button.
     * Scroll to the start of the shown hint.
     * Reposition the feedback dialog, because the height and width likely changed.
     *
     * @param {Object} $Element the feedback hint button element
     * @param {number} position the position of the feedback dialog
     */
    toggleHintAndShowNextHintBtn: function($Element, position) {
      const $Dialog = $("#view-feedback-dialog");
      const feedbackLevel = $Element.data("feedback-level");

      $Element.toggleClass("active");

      $("#feedback-hint-btn-" + (feedbackLevel+1)).show();

      view.lib.toggleAndScrollToElement($("#feedback-hint-" + feedbackLevel), $Dialog);

      view.lib.moveDialog($Dialog, position);
    }
  };
};
