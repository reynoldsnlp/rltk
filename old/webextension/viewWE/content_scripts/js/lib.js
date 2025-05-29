const $ = require('jquery');
require('jquery-ui/ui/widgets/dialog');
require('jquery-ui/themes/base/button.css');
require('jquery-ui/themes/base/core.css');
require('jquery-ui/themes/base/theme.css');
require('jquery-ui/themes/base/dialog.css');

module.exports = function(view) {
  return {
    /**
     * Close the dropdown menu and remove the instant feedback dialog,
     * if the user clicks outside of it.
     */
    initOnWindowClick: function() {
      $(window).on("click", function(event) {
        const $Target = $(event.target);

        if(!$Target.closest("#wertiview-VIEW-menu").length){
          view.VIEWmenu.hide();
        }
        if(!$Target.closest(view.toolbar.selectorStart + "account-menu-button").length){
          view.accountMenu.hide();
        }
        if(!$Target.closest(view.accountMenu.selectorStart + "statistics").length){
          view.statisticsMenu.hide();
        }

        const $Dialog = $("#view-feedback-dialog").parent();
        if(!$Target.closest($Dialog).length){
          view.lib.removeDialog($Dialog);
        }
      });
    },

    /**
     * Create a button element with a given id, class and text.
     *
     * @param {string} id the id of the button
     * @param {string} aClass the class of the button
     * @param {string} text the text of the button
     * @returns {*|jQuery|HTMLElement} the button element
     */
    createButton: function(id, aClass, text) {
      const $Button = $("<button>");
      $Button.attr("id", id);
      $Button.addClass(aClass);
      $Button.text(text);

      return $Button;
    },

    /**
     * Create a list element with a given id and containing
     * an array of items.
     *
     * @param {string} id the id of the list element
     * @param {Array} allItems the list items of the list element
     * @returns {*|jQuery|HTMLElement} the list element with items
     */
    createList: function(id, allItems) {
      const $List = $("<ul>");
      $List.attr("id", id);

      view.lib.addItems(
        $List,
        allItems
      );

      return $List;
    },

    /**
     * Add all items to a given list element.
     *
     * @param {Object} $List the list element the items are added to
     * @param {Array} allItems the items to add
     */
    addItems: function($List, allItems) {
      $.each(allItems, function(index) {
        $List.append($("<li>").html(allItems[index]));
      });
    },

    /**
     * Define a setup for the given dialog element.
     *
     * @param {object} $Dialog the dialog element
     * @param {object} settings the dialog settings
     */
    dialogSetup: function($Dialog, settings) {
      $Dialog.dialog(settings);

      // width = "auto" + maxWidth bug fix
      const maxWidth = settings.maxWidth;
      if(maxWidth){
        $Dialog.dialog("widget").css("max-width", maxWidth);
      }
    },

    /**
     * Remove the given dialog.
     *
     * @param {Object} $Dialog the dialog to be removed
     */
    removeDialog: function($Dialog) {
      $Dialog.remove();
    },

    /**
     * Init the given dialog element with a dialogclose event.
     * Will remove the given dialog element on dialogclose.
     *
     * @param $Dialog the dialog element
     */
    initDialogClose: function($Dialog) {
      $Dialog.on("dialogclose", function() {
        view.lib.removeDialog($Dialog);
      });
    },

    /**
     * Disable all anchors, so that links can't be followed.
     */
    disableAnchors: function() {
      $("a").each(function() {
        $(this).removeAttr("href");
      });
    },

    /**
     * Fisher-Yates shuffle, rearrange an array.
     *
     * @param {Array} elemList the array to rearrange
     */
    shuffleList: function(elemList) {
      let i, j, tempElem;
      for (i = elemList.length; i > 1; i--) {
        j = parseInt(Math.random() * i);
        tempElem = elemList[j];
        elemList[j] = elemList[i - 1];
        elemList[i - 1] = tempElem;
      }
    },

    /**
     * Sort words based on accent placement in Russian
     *
     * @param {Array} elemList the array to rearrange
     */
    sortList: function(elemList) {
      elemList.sort(function (a, b) {
        for(let i = 0; i < a.length; i++) {
          if(a[i] == '́' || a[i] == 'ё' || a[i] == 'Ё') return -1;
          if(b[i] == '́' || b[i] == 'ё' || b[i] == 'Ё') return 1;
        }
        return 0;
      });
    },

    /**
     * Detect capitalization pattern in target word.
     *
     * 0 = not capitalized or weird enough to leave alone
     * 1 = all caps
     * 2 = first letter capitalized
     *
     * @param {String} word the target for detecting capitalization
     * @return {number} the capitalization type
     */
    detectCapitalization: function(word) {
      if(word === word.toUpperCase()){
        return 1;
      }
      else if(word === word.substr(0, 1).toUpperCase() + word.substr(1)){
        return 2;
      }
      else{
        return 0;
      }
    },

    /**
     * Parallel capitalization (for multiple choice drop-downs).
     *
     * @param {string} word the target to be matched with the cap type
     * @param {number} type the capitalization type
     */
    matchCapitalization: function(word, type) {
      switch (type) {
      case 0:
        return word;
      case 1:
        return word.toUpperCase();
      case 2:
        return word.slice(0, 1).toUpperCase() + word.slice(1);
      default:
        return word;
      }
    },

    /**
     * Toggle an element and scroll to it, if possible.
     *
     * @param {object} $Element the element to scroll to
     * @param {object} $ScrollArea the area of the scrolling
     */
    toggleAndScrollToElement: function($Element, $ScrollArea) {
      $Element.toggle();

      view.lib.scrollToElement($Element, $ScrollArea);
    },

    /**
     * Scroll to a visible element inside the scroll area.
     *
     * @param {object} $Element the element to scroll to
     * @param {object} $ScrollArea the area of the scrolling
     */
    scrollToElement: function($Element, $ScrollArea) {
      if($Element.is(":visible")){
        $ScrollArea.scrollTop(
          $Element.offset().top - $ScrollArea.offset().top + $ScrollArea.scrollTop()
        );
      }
    },

    /**
     * Moves a dialog to the given position.
     *
     * @param {object} $Dialog the dialog to move
     * @param {object} position the new position
     */
    moveDialog: function($Dialog, position) {
      $Dialog.dialog("option", "position", position);
    },

    /**
     * Get and update the current original content.
     *
     * @returns {Element} the original content element
     */
    getAndUpdateOriginalContent: function() {
      const originalContent = document.getElementById("wertiview-content");

      view.originalContent = originalContent.innerHTML;

      return originalContent;
    },

    /**
     * Create a content element with the given innerHTML.
     *
     * @param {string} innerHTML the html content of the element
     *
     * @returns {Element} the new content element
     */
    createContentElement: function(innerHTML) {
      const contentElement = document.createElement("div");

      contentElement.id = "wertiview-content";

      contentElement.innerHTML = innerHTML;

      return contentElement;
    }
  };
};
