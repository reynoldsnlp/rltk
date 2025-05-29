const $ = require('jquery');
const morph = require('nanomorph');

module.exports = function(view) {
  return {
    isAborted: false,

    /**
     * Start the enhancement process by creating the request data.
     * Send the request data to background.js for further processing
     * on the server side.
     */
    enhance: function() {
      view.enhancer.restoreToOriginal();

      view[view.activity].initialize();

      if (view.showInst) {
        view.enhancer.constructInstruction();
      }

      view.toolbar.$cache.get(view.toolbar.selectorStart + "abort-button").show();

      const activityData = view.enhancer.createActivityData();

      view.enhancer.requestToSendActivityDataAndGetEnhancementMarkup(activityData);
    },

    /**
     * Start to remove the wertiview markup and
     * restore the original page if there is any markup.
     */
    restoreToOriginal: function() {
      if($("viewenhancement").length){
        const originalContent = view.lib.createContentElement(view.originalContent);

        morph(document.getElementById("wertiview-content"), originalContent);

        view.activityHelper.removeColorLegend();
        view.activityHelper.removeAssistiveReadingContainer();
        view.toolbar.hideRestoreButton();

        view.notification.remove();
        view.blur.remove();

        view.notification.removeInst();
      }
    },

    /**
     * Constructs the instruction when the page is being enhanced for the given
     * topic and activity when the preference "show instructions" is enabled.
     */
    constructInstruction: function() {
      const topic = view.topic;

      const activities = view.topics[topic][view.language].activities;

      const instruction = activities[view.activity].instruction;

      if(instruction){
        const instructionText = instruction.text;

        if (instructionText) {
          view.notification.addInst(instructionText, true);
        }
        else {
          view.notification.addInst("The instruction for the topic " +
                                    "<span class='colorize-style-" + topic + "'>" + topic + "</span>" +
                                    " is missing!", false);
        }
      }
    },

    /**
     * Creates the activity data to be send to the server.
     *
     * @returns {object} the activity data to be send
     */
    createActivityData: function() {
      return {
        url: view.url,
        language: view.language,
        topic: view.topic,
        filter: view.filter,
        activity: view.activity,
        document: $("#wertiview-content").html()
      };
    },

    /**
     * Send a request to the background script to pass on the activity data
     * to the server and get the enhancement markup.
     *
     * @param {object} activityData the data to pass on to the server
     */
    requestToSendActivityDataAndGetEnhancementMarkup: function(activityData) {
      chrome.runtime.sendMessage({
        action: "sendActivityDataAndGetEnhancementMarkup",
        activityData: activityData,
        ajaxTimeout: view.ajaxTimeout
      });
    },

    /**
     * Adds the enhancement markup sent from the server to the page.
     * Will only proceed if the user didn't abort the enhancement.
     *
     * @param {string} enhancementMarkup the markup from the server
     */
    addEnhancementMarkup: function(enhancementMarkup) {
      if (view.enhancer.isAborted) {
        view.enhancer.isAborted = false;
      }
      else{
        view.toolbar.hideAbortButton();

        const originalContent = view.lib.getAndUpdateOriginalContent();

        const newContent = view.lib.createContentElement(enhancementMarkup);

        morph(originalContent, newContent);

        view.selector.select(view.filter);
        view.enhancer.runActivity();
        view.toolbar.initialInteractionState();
        view.toolbar.$cache.get(view.toolbar.selectorStart + "restore-button").show();
        view.enhancer.loadDebuggingOptions();
      }
    },

    /**
     * Load activated debugging options:
     * - debugSentenceMarkup
     */
    loadDebuggingOptions: function() {
      if (view.debugSentenceMarkup) {
        $("sentence, sentence a").css("color", "red");
        $("sentence[data-isbasedonblock]").css("background-color", "greenyellow");
        $("sentence sentence").css("border", "1px solid black");
      }
    },

    /**
     * Runs the activity selected and informs user when finished with processing.
     */
    runActivity: function() {
      switch (view.activity) {
      case "color":

        view.color.run(view.topic);

        view.notification.add("VIEW "
              + view.topics[view.topic][view.language].activities[view.activity].instruction.title
              + " Activity Ready");
        break;
      case "click":
        view.lib.disableAnchors();

        view.click.run(view.topic);

        view.notification.add("VIEW "
              + view.topics[view.topic][view.language].activities[view.activity].instruction.title
              + " Activity Ready");

        break;
      case "mc":
        view.lib.disableAnchors();

        view.mc.run();

        view.notification.add("VIEW "
              + view.topics[view.topic][view.language].activities[view.activity].instruction.title
              + " Activity Ready");
        break;
      case "cloze":
        view.lib.disableAnchors();

        view.cloze.run(view.topic);

        view.notification.add("VIEW "
              + view.topics[view.topic][view.language].activities[view.activity].instruction.title
              + " Activity Ready");
        view.blur.remove();
        break;
      default:
        view.notification.add(
          "The activity '" + view.activity + "' is not implemented!");
      }
    },

    /**
     * Abort the enhancement process.
     */
    abort: function() {
      view.toolbar.initialInteractionState();
      view.enhancer.isAborted = true;
    }
  };
};
