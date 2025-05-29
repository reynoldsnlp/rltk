const $ = require('jquery');

module.exports = function(view) {
  return {
    /**
     * Russian: Handle Assistive Reading Topic
     */
     handleRusAssistiveReading: function() {
       const $Enhancements = $("viewenhancement");
       $Enhancements.on("click", view.assistiveReading.handleRusAssistiveReadingClick);
     },

     /**
      * Russian: Handle Assistive Reading Topic
      */
     handleRusAssistiveReadingClick: function() {
       const $EnhancementElement = $(this);
       if ($EnhancementElement.is("viewenhancement[data-type!='miss'].selected")) {
         if($('#view-assistive-reading-container').length < 1) {
           view.activityHelper.createAssistiveReadingContainer();
           $("#view-assistive-reading-word-list-download").on("click", view.assistiveReading.downloadAssistiveReadingWordList);
           $("#view-assistive-reading-word-list-download").addClass("click-style-pointer");
         }

         $EnhancementElement.addClass("click-style-correct");
         $("#view-assistive-reading-word").text($EnhancementElement.data("correct-form"));

         view.assistiveReading.createRusTranslation($EnhancementElement);
         view.assistiveReading.createRusWordDescription($EnhancementElement);
         view.paradigmTables.createRusParadigmTable($EnhancementElement);
         view.assistiveReading.createRusListItem($EnhancementElement);

         const maxHeightWordList = $("#view-assistive-reading-container").height() - $("#view-assistive-reading-word-container").outerHeight(true)
                - $("#view-assistive-reading-translation").outerHeight(true) - $("#view-assistive-reading-description").outerHeight(true) - 5;
         $("#view-assistive-reading-word-list").css("max-height", maxHeightWordList);
       }

       $EnhancementElement.removeClass("click-style-pointer");
       $EnhancementElement.off("click");
     },

     /**
      * Russian: Create a Word Description for Assistive Reading
      */
     createRusTranslation: function($EnhancementElement) {
       $(".view-assistive-reading-translation-item").remove();

       if($EnhancementElement.data("translation") == null) {
         return;
       }

       var translationArray = $EnhancementElement.data("translation").split(";");
       var translationText = "";
       var count = 1;
       translationArray.forEach(function(item) {
         translationText += "\t" + count + ". " + item + "<br>";
         count++;
       });

       const $TranslationItem = $("<div>");
       $TranslationItem.addClass("view-assistive-reading-translation-item");
       $TranslationItem.html(translationText);
       $("#view-assistive-reading-translation").append($TranslationItem);
     },

     /**
      * Russian: Create a Word Description for Assistive Reading
      */
     createRusWordDescription: function($EnhancementElement) {
       $(".view-assistive-reading-pos-item").remove();

       if($EnhancementElement.data("correct-reading").includes("+V+") || $EnhancementElement.data("correct-reading").includes("+N+")
            || $EnhancementElement.data("correct-reading").includes("+A+") || $EnhancementElement.data("correct-reading").includes("+Num+")) {
          return;
       }
       const $POSItem = $("<div>");
       $POSItem.addClass("view-assistive-reading-pos-item");
       if($EnhancementElement.data("correct-reading").endsWith("+Pr") && $EnhancementElement.data("epenth") != null) {
         $POSItem.text("Preposition: " + $EnhancementElement.data("correct-form") + " (" + $EnhancementElement.data("epenth") + " before some words)");
       }
       else if($EnhancementElement.data("correct-reading").includes("+Pr+") && $EnhancementElement.data("correct-reading").includes("+Epenth")) {
         $POSItem.text("Preposition: " + $EnhancementElement.data("lemma") + " (" + $EnhancementElement.data("correct-form") + " before some words)");
       }
       else if($EnhancementElement.data("correct-reading").endsWith("+Pr") || $EnhancementElement.data("correct-reading").includes("+Pr+")) {
         $POSItem.text("Preposition");
       }
       else {
         const posDict = {
           "+Abbr": "Abbreviation",
           "+Adv": "Adverb",
           "+CC": "Coordinating conjunction",
           "+CS": "Subordinating conjunction",
           "+Interj": "Interjection",
           "+Paren": "Parenthetical",
           "+Pcle": "Particle",
           "+Po": "Postposition",
           "+Pron": "Pronoun"
         };
         for(var key in posDict) {
           if($EnhancementElement.data("correct-reading").includes(key)) {
             $POSItem.text(posDict[key]);
           }
         }
       }
       $("#view-assistive-reading-description").append($POSItem);
     },

     /**
      * Russian: Create a List Item for Assistive Reading
      */
     createRusListItem: function($EnhancementElement) {
       const $ListItem = $("<div>");
       $ListItem.addClass("view-assistive-reading-list-item");

       const $WordItem = $("<div>");
       $WordItem.addClass("view-assistive-reading-word-item");
       $WordItem.text($EnhancementElement.data("stressed-lemma") || $EnhancementElement.data("lemma"));
       $WordItem.data("enhancement-id",$EnhancementElement.attr('id'));

       const $RemoveButton = $("<button>");
       $RemoveButton.text("X");
       $RemoveButton.addClass("view-assistive-reading-word-list-button");
       $RemoveButton.on("click", function() {
         $(this).closest("div").remove();
       });

       $ListItem.append($RemoveButton);
       $ListItem.append($WordItem);
       $("#view-assistive-reading-word-list").append($ListItem);
     },

     /**
      * Russian: Download the word list for Assistive Reading
      */
     downloadAssistiveReadingWordList: function() {
       var tsv = "";
       $(".view-assistive-reading-word-item").each(function() {
         const enhancementId = $(this).data("enhancement-id");
         const $EnhancementElement = $('#' +$.escapeSelector(enhancementId));
         tsv += ($EnhancementElement.data("stressed-lemma") || $EnhancementElement.data("lemma")) + "\t" + $EnhancementElement.data("translation") + "\n";
       });

       var downloadElement = document.createElement('a');
       downloadElement.href = 'data:text/tsv;charset=utf-8,' + encodeURI(tsv);
       downloadElement.target = "_blank";
       downloadElement.download = "translations.tsv";
       downloadElement.click();
     }
  };
};
