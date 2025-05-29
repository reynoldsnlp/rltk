const viewMenuContent = require('../html/view-menu.html');
const $ = require('jquery');

module.exports = function(view) {
  return {
    selectorStart : "#view-VIEW-menu-",

    add: function() {
      const $ViewMenu = $('<div>');
      $ViewMenu.attr("id", "view-VIEW-menu-container");
      $ViewMenu.html(viewMenuContent);

      $("body").append($ViewMenu);

      view.VIEWmenu.init();
    },

    /**
     * Init the handlers for the view menu.
     */
    init: function() {
      view.VIEWmenu.initOpenOptionsPageHandler();

      view.VIEWmenu.initOpenHelpPageHandler();

      view.VIEWmenu.initOpenAboutDialogHandler();
    },

    /**
     * Hide the view menu.
     */
    hide: function() {
      $(view.VIEWmenu.selectorStart + "content").hide();
    },

    /**
     * Open the option page when in the toolbar "options" was clicked.
     */
    initOpenOptionsPageHandler: function() {
      $(view.VIEWmenu.selectorStart + "options").on(
        "click",
        view.VIEWmenu.requestToOpenOptionsPage
      );
    },

    /**
     * Send a request to the background script to call openOptionsPage().
     */
    requestToOpenOptionsPage: function() {
      chrome.runtime.sendMessage({action: "openOptionsPage"});
    },

    /**
     * Open the help page when in the toolbar "help" was clicked.
     */
    initOpenHelpPageHandler: function() {
      $(view.VIEWmenu.selectorStart + "help").on(
        "click",
        view.VIEWmenu.requestToOpenHelpPage
      );
    },

    /**
     * Send a request to the background script to open the help page.
     */
    requestToOpenHelpPage: function() {
      chrome.runtime.sendMessage({action: "openHelpPage"});
    },

    /**
     * On clicking "about", open the about dialog.
     */
    initOpenAboutDialogHandler: function() {
      $(view.VIEWmenu.selectorStart + "about").on("click", view.about.open);
    },

    /**
     * Toggle the VIEW menu.
     */
    toggle: function() {
      $(view.VIEWmenu.selectorStart + "content").toggle();
    }
  };
};
