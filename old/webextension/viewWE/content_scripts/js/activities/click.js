const $ = require('jquery');

module.exports = function(view) {
  return {
    /**
     * Run the click activity.
     *
     * @param {string} topic the name of the topic.
     */
    run: function(topic) {
      const $Enhancements = $("viewenhancement");

      $Enhancements.addClass("click-style-pointer");

      view.activityHelper.getNumberOfExercisesAndRequestTaskId("viewenhancement[data-type!='miss'].selected");

      switch(topic) {
        case "word-stress":
          view.click.handleRusWordStress();
          break;
        case "assistive-reading":
          view.assistiveReading.handleRusAssistiveReading();
          break;
        case "phonetics":
          view.click.handleRusPhonetics();
          break;
        default:
          $Enhancements.on("click", view.click.handler);
      }
    },

    initialize: function() { /* no op */ },

    /**
     * Russian: Handle Phonetics Hover Activity
     */
     handleRusPhonetics: function() {
       $.each(view.activityHelper.createHitList(), function() {
         const capType = view.lib.detectCapitalization($(this).text());
         if($(this).data("phonetic-transcription") != null && $(this).data("phonetic-transcription").length > 0) {
           $(this).on({
             mouseenter: function() {
               $(this).text(view.lib.matchCapitalization($(this).data("phonetic-transcription"), capType));
               $(this).addClass("click-style-correct");
             },
             mouseleave: function() {
               $(this).text(view.lib.matchCapitalization($(this).data("originalText"), capType));
               $(this).removeClass("click-style-correct");
             }
           });
         }
       });
     },

    /**
     * Russian: Handle Word Stress Click Activity
     */
     handleRusWordStress: function() {
       $.each($("viewenhancement"), function() {
         let word = $(this).text();
         $(this).empty();

         for(let i = 0; i < word.length; i++) {
           let $element = $(`<span class="letter">${word[i]}</span>`);
           $(this).append($element);
         }
       });
       $(document).on('click', 'span.letter', view.click.handleRusWordStressLetter);
     },

    /**
     * Turn correctly clicked hits green and incorrect ones red.
     */
    handleRusWordStressLetter: function() {
      let index = $(this.parentElement.childNodes).index($(this));
      let $word = $(this.parentElement);
      let correctform = $word.data("correctform");

      if(correctform == null) return;
      if($word.data("correctform").includes(";")) return;

      if(index + 1 <= correctform.length && correctform[index + 1].includes('́')) {
        const capType = view.lib.detectCapitalization($word.text());
        $word.text(view.lib.matchCapitalization(correctform, capType));
        $word.addClass("click-style-correct");

        $word.removeClass("click-style-incorrect");
        $word.removeClass("click-style-pointer");
      }
      else {
        $word.addClass("click-style-incorrect");
      }
    },

    /**
     * Turn correctly clicked hits green and incorrect ones red.
     */
    handler: function() {
      const timestamp = Date.now();
      view.activityHelper.setTimestamp(timestamp);

      let isCorrect = false;
      const $EnhancementElement = $(this);
      const usedSolution = false;

      if ($EnhancementElement.is("viewenhancement[data-type!='miss'].selected")) {
        isCorrect = true;
        $EnhancementElement.addClass("click-style-correct");
      } else {
        $EnhancementElement.addClass("click-style-incorrect");
      }

      $EnhancementElement.removeClass("click-style-pointer");

      view.tracker.trackData(
        $EnhancementElement,
        $EnhancementElement.text(),
        isCorrect,
        usedSolution
      );

      $EnhancementElement.off("click");
    }
  };
};
