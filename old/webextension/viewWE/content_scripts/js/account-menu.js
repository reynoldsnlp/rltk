const $ = require('jquery');
const accountHTML = require('../html/account-menu.html');

module.exports = function(view) {
  return {
    selectorStart : "#view-account-menu-",

    add: function() {
      const $Account = $("<div>");
      $Account.attr("id", "view-account-menu-container");
      $Account.html(accountHTML);
      $("body").append($Account);

      view.accountMenu.init();
    },

    /**
     * Init the handlers for the view menu.
     */
    init: function() {
      view.accountMenu.initStatisticsMenuHandler();

      view.accountMenu.initSignOutHandler();

      view.accountMenu.setAccountInfo();
    },

    /**
     * Toggle the statistics menu on click.
     */
    initStatisticsMenuHandler: function() {
      $(view.accountMenu.selectorStart + "statistics").on(
        "click",
        view.statisticsMenu.toggle
      );
    },

    /**
     * Init the handler for the sign out.
     * Call openSignOutWindow() on click.
     */
    initSignOutHandler: function() {
      $(view.accountMenu.selectorStart + "sign-out").on(
        "click",
        view.accountMenu.openSignOutWindow
      );
    },

    /**
     * Open the authenticator sign out window.
     */
    openSignOutWindow: function() {
      const signOutWindow = window.open("", "", "width=1,height=1");
      view.accountMenu.assignHref(
        signOutWindow,
        view.authenticator + "?action=sign-out"
      );
    },

    /**
     * Assign the authenticator to the href attribute of the given window.
     *
     * @param {object} myWindow the window we assign the href attribute of
     * @param {string} authenticatorLink the value to be assigned
     */
    assignHref: function(myWindow, authenticatorLink) {
      myWindow.location.href = authenticatorLink;
    },

    /**
     * Set the text of user and e-mail.
     */
    setAccountInfo: function() {
      $(view.accountMenu.selectorStart + "user").text(view.user);
      $(view.accountMenu.selectorStart + "e-mail").text(view.userEmail);
    },

    /**
     * Hide the accountMenu content.
     */
    hide: function() {
      $(view.accountMenu.selectorStart + "content").hide();
    },

    /**
     * Toggle the accountMenu content.
     */
    toggle: function() {
      $(view.accountMenu.selectorStart + "content").toggle();
    }
  };
};
