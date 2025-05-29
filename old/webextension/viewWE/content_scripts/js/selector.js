const $ = require('jquery');

module.exports = {
  select: function(filter) {
    $("sentence:not([data-isbasedonblock])").each(function() {
      const $Sentence = $(this);

        if("all" === filter ||
          "no-filter" === filter){
          $Sentence.find("viewenhancement").addClass("selected");
        }
        else{
          $Sentence.find("[data-filters~='" + filter + "']").addClass("selected");
        }
    });
  }
};
