const $ = require('jquery');
const toolbarHTML = require('../html/toolbar.html');
import SelectorCache from '../../SelectorCache';
import initv2 from './V2';

module.exports = function(view) {
  return {
    activitySelectors: {},

    $cache: new SelectorCache(),

    selectorStart: "#wertiview-toolbar-",

    /**
     * Create the toolbar ui and add it to the body.
     */
    add: function() {
      const $Toolbar = $("<div>");
      $Toolbar.attr("id", "wertiview-toolbar-container");
      $Toolbar.html(toolbarHTML);

      const $Body = $("body");

      view.container.add($Body);

      view.VIEWmenu.add();

      view.accountMenu.add();

      view.statisticsMenu.add();

      view.lib.initOnWindowClick();

      $Body.append($Toolbar);

      view.toolbar.init();
    },

    /**
     * Toggle the toolbar, set storage items if necessary
     */
    toggleToolbar: function() {
      if (view.toolbarExists) {
        view.toolbar.toggle();
      } else {
        view.setStorageItemsAndAddToolbar();
        view.toolbarExists = true;
      }
    },

    /**
     * Toggle the toolbar.
     */
    toggle: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "container").toggle();
      view.container.adjustMargin();
    },

    /**
     * Initialization of the toolbar and active event handlers on the toolbar.
     */
    init: function() {
      view.toolbar.initViewMenu();

      view.toolbar.initAutoEnhance();

      view.toolbar.initLanguageMenu();

      view.toolbar.initTopicMenu();

      view.toolbar.initFilterAndActivityMenu();

      view.toolbar.initActivitySelectors();

      view.toolbar.initialInteractionState();

      view.toolbar.initEnhanceBtn();

      view.toolbar.initAbortBtn();

      view.toolbar.initRestoreBtn();

      view.toolbar.initSignInBtn();

      view.toolbar.initAccountMenuBtn();

      view.toolbar.initToggleToolbarBtn();

      view.toolbar.restoreSelections();

      view.toolbar.toggle();

      view.blur.remove();

      view.toolbar.initializeV2Topics();
    },

    /**
     * Initialise all V2 topics: go through the topic list, look at all topics
     * that are V2, and start them.
     */
    initializeV2Topics: function() {
      (async () => initv2(chrome))();
    },

    /**
     * Init the view menu handler.
     */
    initViewMenu: function() {
      view.toolbar.$cache.get("#wertiview-VIEW-menu").on(
        "click",
        view.VIEWmenu.toggle
      );
    },

    /**
     * Init the handler for auto enhance.
     */
    initAutoEnhance: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "enabled-checkbox").on(
        "click",
        view.toolbar.setAutoEnhance
      );
    },

    /**
     * Set auto enhance to property of "checked".
     */
    setAutoEnhance: function() {
      chrome.storage.local.set({
        enabled: view.toolbar.$cache.get(view.toolbar.selectorStart + "enabled-checkbox").prop("checked")
      });
    },

    /**
     * Init the handler for the language menu selection box.
     * Select the topic menu according to the language on change.
     */
    initLanguageMenu: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "language-menu").on("change", function() {
        view.toolbar.selectTopicMenu($(this).val());
      });
    },

    /**
     * Select the topic menu according to the language option.
     * Hide all other topic menus.
     *
     * @param {string} selectedLanguage the language selected by the user
     */
    selectTopicMenu: function(selectedLanguage) {
      const $topicMenu = view.toolbar.$cache.get(view.toolbar.selectorStart + "topic-menu-" + selectedLanguage);
      const selectedTopicMenu = "selected-toolbar-topic-menu";

      $(".wertiview-topic-menu").removeClass(selectedTopicMenu).hide();

      $topicMenu.addClass(selectedTopicMenu).show();

      const topic = $topicMenu.val();

      view.toolbar.checkForFilters(selectedLanguage, topic);
      view.toolbar.updateActivities(selectedLanguage, topic);
    },

    /**
     * Check if filters are available for the topic and language selection.
     *
     * @param {string} language the current language
     * @param {string} topic the current topic
     */
    checkForFilters: function(language, topic) {
      const $FilterMenu = view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-menu");

      $FilterMenu.hide();
      $FilterMenu.val("no-filter");
      view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-unselected").next().nextAll().remove();

      if(view.topics[topic] &&
         view.topics[topic][language]){
        const filters = view.topics[topic][language].filters;

        if(filters){
          view.toolbar.showFilterMenu(filters);
        }
      }
    },

    /**
     * Show the filter menu with the filters defined for the topic.
     *
     * @param {Object} filters the available filters for the topic
     */
    showFilterMenu: function(filters) {
      const $FilterMenu = view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-menu");

      $FilterMenu.val("unselected");

      view.toolbar.addFilterOptions(filters, $FilterMenu);

      $FilterMenu.show();
    },

    /**
     * Add filter options to the filter menu.
     *
     * @param {Object} filters the available filters for the topic
     * @param {Object} $FilterMenu the filter menu the options are added to
     */
    addFilterOptions: function(filters, $FilterMenu) {
      $.each(filters, function(filter) {
        const filterObject = filters[filter];
        const $Option = $("<option>");

        $Option.attr("id", filterObject.id);
        $Option.val(filterObject.val);
        $Option.text(filterObject.text);

        $FilterMenu.append($Option);
      });
    },

    /**
     * Update activities when the topic is changed. Enable activities available
     * to the topic and disable the ones that aren't.
     * Activity "Pick an Activity" is always enabled, selected and visible.
     *
     * @param language the current language
     * @param topic the current topic
     */
    updateActivities: function(language, topic) {
      const unselected = "unselected";
      const $ActivityMenu = view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-menu");

      $ActivityMenu.children().remove();

      $ActivityMenu.append(view.toolbar.activitySelectors[unselected]);

      if(
        language !== unselected &&
          !topic.startsWith(unselected) &&
          view.topics[topic] &&
          view.topics[topic][language]) {
        const topicSpec = view.topics[topic];
        if (topicSpec.version !== 2) {
          view.toolbar.enableAndShowActivities(language, topic);
        }
      }

      view.toolbar.toggleEnhanceButton();
    },

    /**
     * Toggle the enhance button depending on activity selection
     * and eventually filter selection.
     */
    toggleEnhanceButton: function() {
      const $EnhanceButton = view.toolbar.$cache.get(view.toolbar.selectorStart + "enhance-button");

      if(view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-menu").val() === "unselected" ||
         view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-menu").val() === "unselected"){
        $EnhanceButton.prop("disabled", true);
      }
      else{
        $EnhanceButton.prop("disabled", false);
      }
    },

    /**
     * Enable and show only activities that are available for the language and
     * topic combination. Show the horizontal separator.
     *
     * @param {string} language the selected language
     * @param {string} topic the selected topic
     */
    enableAndShowActivities: function(language, topic) {
      const $ActivityMenu = view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-menu");
      const activitySelectors = view.toolbar.activitySelectors;
      const availableActivities = view.topics[topic][language].activities;

      $ActivityMenu.append(activitySelectors["splitter"]);

      $.each(availableActivities, function(activity) {
        // Change the title of the activity based on the title presented in the JSON files
        if(activitySelectors[activity].text() != view.topics[topic][language].activities[activity].instruction.title) {
          activitySelectors[activity].text(view.topics[topic][language].activities[activity].instruction.title);
        }
        $ActivityMenu.append(activitySelectors[activity]);
      });

      $ActivityMenu.val("unselected");
    },

    /**
     * Init the handler for the topic menu selection box.
     * Update the activities according to language and topic on change.
     */
    initTopicMenu: function() {
      view.toolbar.$cache.get(
        view.toolbar.selectorStart + "topic-menu-unselected, " +
          view.toolbar.selectorStart + "topic-menu-en, " +
          view.toolbar.selectorStart + "topic-menu-de, " +
          view.toolbar.selectorStart + "topic-menu-es, " +
          view.toolbar.selectorStart + "topic-menu-ru").on("change", function() {
            const language = view.toolbar.$cache.get(view.toolbar.selectorStart + "language-menu").val();
            const topic = $(this).val();

            view.toolbar.checkForFilters(language, topic);

            view.toolbar.updateActivities(language, topic);
          });
    },

    /**
     * Initialize the filter and activity menu handler.
     */
    initFilterAndActivityMenu: function() {
      view.toolbar.$cache.get(
        view.toolbar.selectorStart + "filter-menu, " +
        view.toolbar.selectorStart + "activity-menu").on("change",
        view.toolbar.toggleEnhanceButton
      );
    },

    /**
     * Init all activity selectors in order to retrieve
     * the proper activity options for a topic.
     */
    initActivitySelectors: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-menu").find("option").each(function() {
        const $ActivityOption = $(this);

        view.toolbar.activitySelectors[$ActivityOption.val()] = $ActivityOption;
      });
    },

    /**
     * Returns to initial interaction state, where the loading image, abort
     * and restore button are hidden and the enhance button is enabled.
     * Blur overlay is removed.
     */
    initialInteractionState: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "enhance-button").show();
      view.toolbar.hideRestoreButton();
      view.toolbar.hideAbortButton();
      view.toolbar.$cache.get(view.toolbar.selectorStart + "loading").hide();
      view.blur.remove();
    },

    /**
     * Hide the restore button.
     */
    hideRestoreButton: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "restore-button").hide();
    },

    /**
     * Hide the abort button.
     */
    hideAbortButton: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "abort-button").hide();
    },

    /**
     * Init the handler for the enhance button.
     */
    initEnhanceBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "enhance-button").on(
        "click",
        view.toolbar.setSelectionsPrepareAndEnhance
      );
    },

    /**
     * Set language, topic, activity and timestamp if none of the activities
     * are "unselected".
     * Afterwards prepare to enhance the page.
     */
    setSelectionsPrepareAndEnhance: function() {
      const timestamp = Date.now();
      const language = view.toolbar.$cache.get(view.toolbar.selectorStart + "language-menu").val();
      const topic = $(".selected-toolbar-topic-menu").val();
      const filter = view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-menu").val();
      const activity = view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-menu").val();

      chrome.storage.local.set({
        language: language,
        topic: topic,
        filter: filter,
        activity: activity,
        timestamp: timestamp
      }, view.toolbar.prepareAndEnhance);
    },

    /**
     * Prepare buttons and loading image, then start the enhancement.
     */
    prepareAndEnhance: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "enhance-button").hide();
      view.toolbar.hideRestoreButton();
      view.toolbar.$cache.get(view.toolbar.selectorStart + "loading").show();

      view.enhancer.enhance();
    },

    /**
     * Init the handler for the abort button.
     */
    initAbortBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "abort-button").on(
        "click",
        view.enhancer.abort
      );
    },

    /**
     * Init the handler for the restore button.
     */
    initRestoreBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "restore-button").on(
        "click",
        view.enhancer.restoreToOriginal
      );
    },

    /**
     * Init the handler for the sign in button.
     */
    initSignInBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "account-sign-in-button").on(
        "click",
        view.toolbar.openSignInWindow
      );
    },

    /**
     * Open the authenticator sign in window.
     */
    openSignInWindow: function() {
      const signInWindow = window.open("", "", "width=985,height=735");
      view.toolbar.assignHrefAndFocus(
        signInWindow,
        view.authenticator + "?action=sign-in"
      );
    },

    /**
     * Assign the authenticator to the href attribute of the given window
     * and focus on it.
     *
     * @param {object} myWindow the window we assign the href attribute of
     * @param {string} authenticatorLink the value to be assigned
     */
    assignHrefAndFocus: function(myWindow, authenticatorLink) {
      myWindow.location.href = authenticatorLink;
      myWindow.focus();
    },

    /**
     * Init the handler for the account menu button.
     */
    initAccountMenuBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "account-menu-button").on(
        "click",
        view.accountMenu.toggle
      );
    },

    /**
     * Init the handler for the "X" button.
     */
    initToggleToolbarBtn: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "toggle-button").on("click", view.toolbar.toggle);
    },

    /**
     * Restores all selections from language, topic, filter and activity.
     * Restore auto-run option (enabled/disabled).
     */
    restoreSelections: function() {
      view.toolbar.restoreSelectionMenus();

      view.toolbar.toggleEnhanceButton();

      view.toolbar.verifySignInStatus();

      view.toolbar.restoreAutoEnhance();
    },

    /**
     * Restore all selections of the selection menus.
     */
    restoreSelectionMenus: function() {
      const selected = "selected";
      const language = view.language;
      const topic = view.topic;

      view.toolbar.$cache.get(view.toolbar.selectorStart + "language-" + language).prop(selected, true);

      const topicMenu = view.toolbar.selectorStart + "topic-" + topic;

      // special case Dets and Preps are shared between en, de and es
      if(topic === "determiners" || topic === "Preps"){
        view.toolbar.$cache.get(topicMenu + "-" + language).prop(selected, true);
      }
      else{
        view.toolbar.$cache.get(topicMenu).prop(selected, true);
      }

      view.toolbar.selectTopicMenu(language);

      view.toolbar.$cache.get(view.toolbar.selectorStart + "filter-" + view.filter).prop(selected, true);

      view.toolbar.$cache.get(view.toolbar.selectorStart + "activity-" + view.activity).prop(selected, true);
    },

    /**
     * The user will be signed in/out according to the value of the
     * stored user.
     */
    verifySignInStatus: function() {
      const user = view.user;

      if(!user){
        view.toolbar.signOut();
      }
      else{
        view.toolbar.signIn(user);
      }
    },

    /**
     * Restore the auto-enhance selection.
     * If auto-enhance is enabled, set selections and prepare to enhance.
     */
    restoreAutoEnhance: function() {
      if(view.enabled){
        view.toolbar.setSelectionsPrepareAndEnhance();
      }
      view.toolbar.restoreAutoEnhanceCheckbox();
    },

    /**
     * Restore the auto enhance checkbox.
     */
    restoreAutoEnhanceCheckbox: function() {
      view.toolbar.$cache.get(view.toolbar.selectorStart + "enabled-checkbox").prop("checked", view.enabled);
    },

    /**
     * Hide the sign in button and show the account menu button.
     *
     * @param {string} user the user name
     */
    signIn: function(user) {
      const accountIdStart = view.toolbar.selectorStart + "account-";
      const firstLetterOfUser = user.substring(0, 1);

      view.toolbar.$cache.get(accountIdStart + "sign-in-button").hide();
      view.toolbar.$cache.get(accountIdStart + "menu-button").text(firstLetterOfUser).show();
    },

    /**
     * Show the sign in button and hide the account menu button.
     */
    signOut: function() {
      const accountIdStart = view.toolbar.selectorStart + "account-";

      view.toolbar.$cache.get(accountIdStart + "menu-button").text("").hide();
      view.toolbar.$cache.get(accountIdStart + "sign-in-button").show();
    }
  };
};
