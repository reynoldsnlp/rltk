const $ = require('jquery');

module.exports = function(view) {
  return {

    /**
     * Add a blur overlay before enhancement.
     */
    initialize: function() {
      view.blur.add();
    },

    /**
     * Run the cloze activity.
     */
    run: function(topic) {
      if(topic == "participles") {
        $("viewenhancement[data-type='hit'].selected").each(function() {
          // TODO: This isn't ideal. We need to fix the disambiguator
          if($(this).data("rephrase") == null) {
            $(this).removeClass("selected");
          }
        });
      }

      switch(topic) {
        case "word-stress":
          view.cloze.handleRusWordStress();
          break;
        default:
          view.activityHelper.exerciseHandler(view.cloze.createExercise);
          $(".viewinput").on("keyup", view.cloze.handler);
      }
    },

    /**
     * Russian: Handle Word Stress Hover Activity
     */
     handleRusWordStress: function() {
       $("viewenhancement").addClass("click-style-pointer");
       $.each(view.activityHelper.createHitList(), function() {
         const capType = view.lib.detectCapitalization($(this).text());
         $(this).on({
           mouseenter: function() {
             $(this).text(view.lib.matchCapitalization($(this).data("correctform"), capType));
             $(this).addClass("click-style-correct");
           },
           mouseleave: function() {
             $(this).text(view.lib.matchCapitalization($(this).data("originalText"), capType));
             $(this).removeClass("click-style-correct");
           }
         });
       });
     },


    /**
     * Create an exercise for the enhancement element.
     *
     * @param {object} $hit the enhancement element the exercise is created for
     */
    createExercise: function($hit) {

      const capType = view.lib.detectCapitalization($hit.text());

      const answer = view.activityHelper.getCorrectAnswer($hit, capType);

      view.cloze.createInputBox(answer, $hit);

      if(view.topic == "participles" || view.topic == "gerunds" || view.topic == "phonetics") {
        view.cloze.createRussianHint($hit);
      }
      else {
        view.activityHelper.createHint($hit);

        view.cloze.addBaseform($hit);
      }
    },

    /**
     * Create the input box.
     *
     * @param {string} answer the correct answer
     * @param {object} $hit the enhancement element the input box is appended to
     */
    createInputBox: function(answer, $hit) {
      // create input box
      const $InputBox = $("<input>");
      $InputBox.addClass("viewinput");
      $InputBox.addClass("cloze-style-input");

      $InputBox.attr("type", "text");
      // average of 10 px per letter (can fit 10 x "м" with a width of 110)
      $InputBox.css("width", (answer.length * 10) + "px");

      $InputBox.data("view-answer", answer);

      $hit.empty();
      $hit.append($InputBox);
    },

    /**
     * Add the baseform (lemma) next to the input box.
     *
     * @param {object} $hit the enhancement element containing the input box
     */
    addBaseform: function($hit) {
      const $baseform = $("<viewbaseform>");
      $baseform.addClass("cloze-style-baseform");
      const lemmaform = $hit.data("lemma");
      if (lemmaform) {
        $baseform.text(" (" + lemmaform + ")");
        $hit.append($baseform);
      }
    },

    /**
     * Add the baseform (lemma) next to the input box.
     *
     * @param {object} $hit the enhancement element containing the input box
     */
    createRussianHint: function($hit) {
      if(view.topic == "participles") {
        const $hint = $("<viewhint>");
        $hint.addClass("view-style-hint");
        $hint.text(" (" + $hit.data("rephrase")+ ")");
        $hit.append($hint);
      }
      else if(view.topic == "gerunds") {
        const $hint = $("<viewhint>");
        $hint.addClass("view-style-hint");
        const lemmaform = $hit.data("lemma");
        if($hit.attr("id").includes("PrsAct")) {
          $hint.text(" (" + lemmaform + " - present)");
        }
        else if($hit.attr("id").includes("PstAct")) {
          $hint.text(" (" + lemmaform + " - past)");
        }
        $hit.append($hint);
      }
      else if(view.topic == "phonetics"
         && $hit.data("phonetic-transcription") != null
         && $hit.data("phonetic-transcription").length > 0) {
       const $hint = $("<viewhint>");
       $hint.addClass("view-style-hint");
       $hint.text("(" + $hit.data("hint") + ")");
       $hit.append($hint);
     }
    },

    /**
     * Call the input handler when the enter key is released.
     *
     * @param {object} e the triggered event
     */
    handler: function(e) {
      const code = e.which;
      if(code === 13) {
        view.activityHelper.inputHandler(e);
      }
    },
  };
};
