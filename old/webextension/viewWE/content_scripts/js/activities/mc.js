const $ = require('jquery');

module.exports = function(view) {
  return {
    /**
     * Run the multiple choice activity.
     */
    run: function() {
      // If any Russian enhancements do not have distractors,
      // do not create a Multiple Choice exercise for them
      if(view.language == "ru") {
        $("viewenhancement[data-type='hit'].selected").each(function() {
          if($(this).data("distractors") == null) $(this).removeClass("selected");
        });
      }

      view.activityHelper.exerciseHandler(view.mc.createExercise);

      $(".viewinput").on("change", view.activityHelper.inputHandler);
    },

    initialize: function() { /* do nothing */ },

    /**
     * Create an exercise for the enhancement element.
     *
     * @param {object} $hit the enhancement element the exercise is created for
     */
    createExercise: function($hit) {
      const hitText = $hit.text();

      const capType = view.lib.detectCapitalization(hitText);

      const answer = view.activityHelper.getCorrectAnswer($hit, capType);

      const options = view.mc.getOptions($hit, answer, capType);

      view.mc.createSelectBox(options, hitText, answer, $hit);

      view.activityHelper.createHint($hit);
    },

    /**
     * Gets the options provided by the server in the distractors attribute.
     *
     * @param {object} $hit the enhancement element
     * @param {string} answer the correct answer
     * @param {number} capType the capitalization type of the original word
     * @returns {Array} the options
     */
    getOptions: function($hit, answer, capType) {
      const distractors = $hit.data("distractors").split(";");
      view.lib.shuffleList(distractors);

      return view.mc.fillOptions(distractors, answer, capType);
    },

    /**
     * Add the distractor forms to the options.
     *
     * @param {Array} distractors the distractor forms
     * @param {string} answer the correct answer
     * @param {number} capType the capitalization type of the original word
     */
    fillOptions: function(distractors, answer, capType) {
      const options = [];
      let j = 0;

      while (j < distractors.length ){ //&& options.length < 4) {
        const distractor = distractors[j];
        if (distractor.toLowerCase() !== answer.toLowerCase()) {
          view.mc.addOption(options, distractor, capType);
        }
        j++;
      }
      view.mc.addOption(options, answer, capType);
      view.lib.shuffleList(options);
      view.lib.sortList(options);
      return options;
    },

    /**
     * Add an option with correct capitalization to all options.
     *
     * @param {Array} options all other options
     * @param {string} option the option to add
     * @param {number} capType the capitalization type of the original word
     */
    addOption: function(options, option, capType) {
      options.push(view.lib.matchCapitalization(option, capType));
    },

    /**
     * Create the select box with distractors as options.
     *
     * @param {Array} options the selection options
     * @param {string} hitText the original text of the enhancement tag
     * @param {string} answer the correct answer
     * @param {object} $hit the enhancement element the input box is appended to
     */
    createSelectBox: function(options, hitText, answer, $hit) {
      const $SelectBox = $("<select>");
      $SelectBox.addClass("viewinput");

      view.mc.addSelectOption($SelectBox, "");

      for (let j = 0; j < options.length; j++) {
        view.mc.addSelectOption($SelectBox, options[j]);
      }

      $SelectBox.data("view-answer", answer);

      $hit.empty();
      $hit.append($SelectBox);
    },

    /**
     * Add an option to the select box.
     *
     * @param {object} $SelectBox the select box to update
     * @param {string} optionText the text of the option to add
     */
    addSelectOption: function($SelectBox, optionText) {
      $SelectBox.append($("<option>").text(optionText));
    }
  };
};
