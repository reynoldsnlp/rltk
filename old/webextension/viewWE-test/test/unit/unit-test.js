/**
 * This class contains utility functions frequently used
 * in unit tests for convenience purposes.
 */

import view from '../../../viewWE/content_scripts/js/view.js';

const testServerURL = "https://view.byu.edu";

const unitTest = {
  /**
   * Set all view properties used in the add-on to default values.
   */
  setViewDefaults: function() {
    view.setItems({
      // General options
      serverURL: testServerURL,
      servletURL: testServerURL + "/view",
      serverTaskURL: testServerURL + "/act/task",
      serverTrackingURL: testServerURL + "/act/tracking",
      authenticator: testServerURL + "/authenticator.html",
      ajaxTimeout: 60000,
      userEmail: "",
      userid: "",

      // task data
      user: "",
      token: "",
      taskId: "",
      timestamp: "",
      numberOfExercises: 0,

      // user options
      fixedOrPercentage: 0,
      fixedNumberOfExercises: 25,
      percentageOfExercises: 100,
      choiceMode: 0,
      firstOffset: 0,
      intervalSize: 1,
      showInst: false,
      debugSentenceMarkup: false,

      // enabled, language, topic and activity selections
      enabled: false, // should the page be enhanced right away?
      language: "unselected",
      topic: "unselected",
      filter: "no-filter",
      activity: "unselected",

      // properties not stored in local storage
      toolbarExists: false,
      originalContent: ""
    });
  },

  /**
   * Set all given items to view.
   *
   * @param {object} items the items to set
   */
  setViewItems: function(items) {
    view.setItems(items);
  }
};

export default unitTest;
