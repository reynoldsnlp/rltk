const $ = require("jquery");

module.exports = function(view) {
  return {
    /**
     * Run the colorize activity.
     *
     * @param {string} topic the name of the topic.
     */
    run: function(topic) {
      switch(topic) {
        case "word-stress":
          view.color.handleRusWordStress();
          break;
        case "verb-aspect-pairs":
        case "verbs":
          view.color.handleRusVerbAspect();
          break;
        case "verb-tense":
          view.color.handleRusVerbTense();
          break;
        case "participles":
          view.color.handleRusParticiples();
          break;
        case "gerunds":
          view.color.handleRusGerunds();
          break;
        case "phonetics":
          view.color.handleRusPhonetics();
          break;
        default:
          $("viewenhancement.selected").addClass("colorize-style-" + topic);
      }
    },

    initialize: function() { /* no op */ },

    /**
     * Russian: Marks word stress on each word
     */
    handleRusWordStress: function() {
      $.each(view.activityHelper.createHitList(), function() {
        const capType = view.lib.detectCapitalization($(this).text());
        $(this).text(view.lib.matchCapitalization($(this).data("correctform"), capType));
      });
    },

    /**
     * Russian: Turn Imperfective Verbs purple and Perfective Verbs orange
     */
    handleRusVerbAspect: function() {
      $.each($("viewenhancement.selected"), function() {
        if($(this).attr("id").includes("Impf"))
          $(this).addClass("colorize-style-verb-imperfective-aspect");
        else $(this).addClass("colorize-style-verb-perfective-aspect");
      });

      const filters = [];
      filters.push({ filterName: "Imperfective", class: "colorize-style-verb-imperfective-aspect" });
      filters.push({ filterName: "Perfective", class: "colorize-style-verb-perfective-aspect" });
      view.activityHelper.createColorLegend(filters);
    },

    /**
     * Russian: Turn Present Tense Verbs purple, Past Tense Verbs orange,
     * and Future Tense Verbs blue
     */
    handleRusVerbTense: function() {
      $.each($("viewenhancement.selected"), function() {
        if($(this).attr("id").includes("-Prs-"))
          $(this).addClass("colorize-style-verb-present-tense");
        else if($(this).attr("id").includes("-Pst-"))
          $(this).addClass("colorize-style-verb-past-tense");
        else if($(this).attr("id").includes("-Fut-"))
          $(this).addClass("colorize-style-verb-future-tense");
      });

      const filters = [];
      filters.push({ filterName: "Present Tense", class: "colorize-style-verb-present-tense" });
      filters.push({ filterName: "Past Tense", class: "colorize-style-verb-past-tense" });
      filters.push({ filterName: "Future Tense", class: "colorize-style-verb-future-tense" });
      view.activityHelper.createColorLegend(filters);
    },

    /**
     * Russian: Turn Present Passive Participles orange, Past Passive Participles green,
     * Present Active Participles blue, and Past Active Participles purple
     */
    handleRusParticiples: function() {
      $.each($("viewenhancement.selected"), function() {
        if($(this).attr("id").includes("PrsPss"))
          $(this).addClass("colorize-style-participles-prspss");
        else if($(this).attr("id").includes("PstPss"))
          $(this).addClass("colorize-style-participles-pstpss");
        else if($(this).attr("id").includes("PrsAct"))
          $(this).addClass("colorize-style-participles-prsact");
        else if($(this).attr("id").includes("PstAct"))
          $(this).addClass("colorize-style-participles-pstact");
      });

      const filters = [];
      filters.push({ filterName: "Present Passive", class: "colorize-style-participles-prspss" });
      filters.push({ filterName: "Past Passive", class: "colorize-style-participles-pstpss" });
      filters.push({ filterName: "Present Active", class: "colorize-style-participles-prsact" });
      filters.push({ filterName: "Past Active", class: "colorize-style-participles-pstact" });
      view.activityHelper.createColorLegend(filters);
    },

    /**
     * Russian: Turn Present Active Gerunds orange and Past Active Gerunds purple
     */
    handleRusGerunds: function() {
      $.each($("viewenhancement.selected"), function() {
        if($(this).attr("id").includes("PrsAct"))
          $(this).addClass("colorize-style-gerunds-prsact");
        else if($(this).attr("id").includes("PstAct"))
          $(this).addClass("colorize-style-gerunds-pstact");
      });

      const filters = [];
      filters.push({ filterName: "Present", class: "colorize-style-gerunds-prsact" });
      filters.push({ filterName: "Past", class: "colorize-style-gerunds-pstact" });
      view.activityHelper.createColorLegend(filters);
    },

    /**
     * Russian: Turn Russian words into their phonetic representation
     */
    handleRusPhonetics: function() {
      $.each($("viewenhancement.selected"), function() {
        if($(this).data("phonetic-transcription") != null && $(this).data("phonetic-transcription").length > 0) {
          $(this).text($(this).data("phonetic-transcription"));
        }
      });
    }
  };
};
