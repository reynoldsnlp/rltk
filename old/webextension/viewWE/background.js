import ViewServer from './ViewServer';
import Storage from './Storage';

const theServerURL = "https://view.byu.edu";
/** @namespace */

const $ = require('jquery');

const background = {
  tabs: [],
  currentTabId: -1,

  /**
   * Install the addon:
   *
   * - load topics into storage
   * - set defaults
   *
   * @param {Object} details Details for the update event. See
   *  https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onInstalled
   */
  install: function(details) {
    if (details.reason === "install" || details.reason === "update") {
      background.setDefaults();
    }
  },

  /**
   * Set all default values to storage.
   * This is only toggleed once after the add-on was installed.
   */
  setDefaults: function() {
    // Static options
    chrome.storage.local.set({
      topics: {
        articles: require('./topics/articles.json'),
        determiners: require('./topics/determiners.json'),
        agreement: require('./topics/agreement.json'),
        prepositions: require('./topics/prepositions.json'),
        particleverbs: require('./topics/particleverbs.json'),
        nouns: require('./topics/nouns.json'),
        adjectives: require('./topics/adjectives.json'),
        participles: require('./topics/participles.json'),
        gerunds: require('./topics/gerunds.json'),
        verbs: require('./topics/verbs.json'),
        'verb-aspect-pairs': require('./topics/verb-aspect-pairs.json'),
        'verb-tense': require('./topics/verb-tense.json'),
        'word-stress': require('./topics/word-stress.json'),
        phonetics: require('./topics/phonetics.json'),
        'assistive-reading': require('./topics/assistive-reading.json')
      },
      ajaxTimeout: 60000
    });

    // User-mutable options
    const defaults = {
      // General options
      serverURL: theServerURL,
      servletURL: theServerURL + "/view",
      serverTaskURL: theServerURL + "/act/task",
      serverTrackingURL: theServerURL + "/act/tracking",
      authenticator: theServerURL + "/authenticator.html",
      userEmail: "",
      userid: "",

      // task data
      user: "",
      token: "",
      taskId: "",
      timestamp: "",
      numberOfExercises: 0,
      // user options
      fixedOrPercentage: 0,
      fixedNumberOfExercises: 25,
      percentageOfExercises: 100,
      choiceMode: 0,
      firstOffset: 0,
      intervalSize: 1,
      showInst: false,
      debugSentenceMarkup: false,

      // enabled, language, topic and activity selections
      enabled: false, // should the page be enhanced right away?
      language: "unselected",
      topic: "unselected",
      filter: "no-filter",
      activity: "unselected"
    };

    // We retrieve the existing settings from storage, then generate a new
    // settings object by overwriting the defaults with the existing settings
    chrome.storage.local.get(
      Object.keys(defaults),
      existingSettings => {
        const newSettings = Object.assign({}, defaults, existingSettings);
        chrome.storage.local.set(newSettings);
      }
    );
  },

  /**
   * When the tab starts loading, the url is set or tab finished loading
   * this event will be fired.
   *
   * If the latter event occurs the toolbar will be toggled when the user
   * wanted to open the toolbar before the tab was loaded.
   *
   * @param tabId {number} the current tab id
   * @param changeInfo {object} the info about the change
   */
  onUpdatedTab: function(tabId, changeInfo) {
    if(background.tabs[tabId].isWaiting && changeInfo.status === "complete"){
      background.toggleToolbar(tabId);
    }
  },

  /**
   * Handle the browser action button.
   * Set defaults, if necessary.
   * Toggle the toolbar when the tab is ready, otherwise wait.
   *
   * @param {object} tab the current tab info
   */
  clickButton: function(tab) {
    const tabId = tab.id;

    background.currentTabId = tabId;

    if(tab.status === "complete"){
      background.toggleToolbar(tabId);
    }
    else{
      background.tabs[tabId] = {isWaiting: true};
      background.addBlur(tabId, "The page is still loading...");
    }
  },

  /**
   * Stop waiting for the tab to load and
   * send the message to toggle the toolbar.
   */
  toggleToolbar(tabId) {
    background.tabs[tabId] = {isWaiting: false};
    chrome.tabs.sendMessage(tabId, {action: "toggleToolbar"});
  },

  /**
   * Send the message to blur the page.
   */
  addBlur(tabId, html) {
    chrome.tabs.sendMessage(tabId, {
      action: "addBlur",
      html: html
    });
  },

  /**
   * Processes all messages received from content scripts and
   * toolbar.js.
   * Sends requests to content scripts toolbar.js or the server
   * depending on the message.
   *
   * @param {*} request the message sent by the calling script
   * @param {Object} sender the MessageSender Object containing sender info
   * @callback sendResponseCallback
   * @param {sendResponseCallback} sendResponse function to call as response
   */
  processMessage: function(request, sender, sendResponse) {
    background.currentTabId = sender.tab.id;

    const action = request.action;

    if (action && background.hasOwnProperty(action)) {
      const parameters = {
        request,
        sender,
        sendResponse
      };
      return background[action](parameters);
    }
    background.createBasicNotification(
      "unhandled-message-notification",
      "Unhandled Message!",
      "There was no handler for message: " + JSON.stringify(request) + "!"
    );
    return undefined;
  },

  /**
   * The content script view-menu.js send the message to open the options page.
   */
  openOptionsPage: function() {
    chrome.runtime.openOptionsPage();
  },

  /**
   * The content script view-menu.js send the message to open the help page.
   */
  openHelpPage: function() {
    const url = "http://sifnos.sfs.uni-tuebingen.de/VIEW/index.jsp?content=activities";
    chrome.tabs.create({url: url});
  },

  /**
   * Helper function for ajax post requests.
   *
   * @param {string} url the server url
   * @param {Object} data the data sent to the server
   * @param {number} ajaxTimeout the amount of time given for the server
   * to respond
   *
   * @returns ajax post request to the server with the default options
   */
  ajaxPost: function(url, data, ajaxTimeout) {
    return $.post({
      url: url,
      data: JSON.stringify(data),
      dataType: "text",
      processData: false,
      timeout: ajaxTimeout
    });
  },

  /**
   * Send the activity data from enhancer.js to the
   * server for processing.
   * If successful, request a call of view.enhancer.addEnhancementMarkup(data).
   *
   * @param {object} parameters request, sender and sendResponse from
   * processMessage
   */
  sendActivityDataAndGetEnhancementMarkup: function(parameters) {
    const request = parameters.request;
    const ajaxTimeout = request.ajaxTimeout || 120000;
    chrome.storage.local.get(
      "servletURL",
      function(data) {
        background.ajaxPost(
          data.servletURL,
          request.activityData,
          ajaxTimeout)
        .done(function(data, textStatus, xhr) {
          if (data) {
            background.requestToAddEnhancementMarkup(data);
          } else {
            background.ajaxError(xhr, "nodata");
          }
        })
        .fail(function(xhr, textStatus) {
          background.ajaxError(xhr, textStatus);
        });
      }
    );
  },

  /**
   * Add enhancement markup data from the server by sending a request to the
   * content script to call view.enhancer.addEnhancementMarkup(data).
   *
   * @param {string} data the html markup to be added to the current page
   */
  requestToAddEnhancementMarkup: function(data) {
    chrome.tabs.sendMessage(background.currentTabId, {
      action: "addEnhancementMarkup",
      data: data
    });
  },

  /**
   * Send the task data to the server for processing, get and set
   * the task id obtained from the server.
   *
   * @param {object} parameters request, sender and sendResponse from
   * processMessage
   */
  sendTaskDataAndGetTaskId: function(parameters) {
    chrome.storage.local.get(
      "serverTaskURL",
      function(data) {
        background.ajaxPost(
          data.serverTaskURL,
          parameters.request.taskData,
          10000)
        .done(function(data, textStatus, xhr) {
          if (data) {
            const taskData = JSON.parse(data);
            background.setTaskId(taskData["task-id"]);
          } else {
            background.ajaxError(xhr, "no-task-data");
          }
        }).fail((xhr, textStatus) => {
          background.ajaxError(xhr, textStatus);
        });
      }
    );
  },

  /**
   * Set the task id to storage.
   *
   * @param {number} taskId the task id from the server
   */
  setTaskId: function(taskId) {
    chrome.storage.local.set({taskId: taskId});
  },

  /**
   * Send the tracking data to the server for processing.
   * If successful, request to call
   * view.feedbacker.showFeedback(submissionResponseData).
   *
   * @param {object} parameters request, sender and sendResponse from
   * processMessage
   */
  sendTrackingData: function(parameters) {
    chrome.storage.local.get(
      "serverTrackingURL",
      function(data) {
        background.ajaxPost(
          data.serverTrackingURL,
          parameters.request.trackingData,
          10000)
        .done(function(data, textStatus, xhr) {
          if (data) {
            const submissionResponseData = JSON.parse(data);
            background.requestToShowFeedback(submissionResponseData);
          } else {
            background.ajaxError(xhr, "no-performance-data");
          }
        });
      }
    );
  },

  /**
   * Send a request to the content script to call
   * view.feedbacker.showFeedback(submissionResponseData).
   *
   * @param {Object} submissionResponseData the response from the
   * server after tracking data was processed
   */
  requestToShowFeedback: function(submissionResponseData) {
    chrome.tabs.sendMessage(background.currentTabId, {
      action: "showFeedback",
      submissionResponseData: submissionResponseData
    });
  },

  /**
   * Helper function for ajax get requests.
   *
   * @param {string} url the server url
   * @param {Object} queryParam the query parameter(s)
   * @param {number} ajaxTimeout the amount of time given for the server
   * to respond
   *
   * @returns ajax get request to the server with the default options
   */
  ajaxGet: function(url, queryParam, ajaxTimeout) {
    return $.get({
      url: url + queryParam,
      timeout: ajaxTimeout
    });
  },

  /**
   * Send the request from statistics-menu.js to the
   * server to get all tasks.
   * If successful, request a call of view.statisticsMenu.showAllTasks(data).
   *
   * @param {object} parameters request, sender and sendResponse from
   * processMessage
   */
  getAllTasks: function(parameters) {
    const request = parameters.request;
    const ajaxTimeout = request.ajaxTimeout || 120000;
    background.ajaxGet(request.serverTaskURL,
      request.queryParam,
      ajaxTimeout)
    .done(function(data, textStatus, xhr) {
      if (data) {
        background.requestToShowAllTasks(data);
      } else {
        background.ajaxError(xhr, "no-task-data");
      }
    })
    .fail(function(xhr, textStatus) {
      background.ajaxError(xhr, textStatus);
    });
  },

  /**
   * Send a request to the content script to call
   * view.statisticsMenu.showAllTasks(data).
   *
   * @param {string} tasksData data containing all tasks
   */
  requestToShowAllTasks: function(tasksData) {
    chrome.tabs.sendMessage(background.currentTabId, {
      action: "showAllTasks",
      tasksData: tasksData
    });
  },

  /**
   * Send the request from statistics-menu.js to the
   * server to get a list of performances for a task.
   * If successful, request a call of view.statisticsMenu.showTask(data).
   *
   * @param {object} parameters request, sender and sendResponse from
   * processMessage
   */
  getTask: function(parameters) {
    const request = parameters.request;
    const ajaxTimeout = request.ajaxTimeout || 120000;
    background.ajaxGet(request.serverTrackingURL,
      request.queryParam,
      ajaxTimeout)
    .done(function(data, textStatus, xhr) {
      if (data) {
        background.requestToShowTask(data);
      } else {
        background.ajaxError(xhr, "no-performance-data");
      }
    })
    .fail(function(xhr, textStatus) {
      background.ajaxError(xhr, textStatus);
    });
  },

  /**
   * Send a request to the content script to call
   * view.statisticsMenu.showTask(data).
   *
   * @param {string} performancesData data containing all performances for
   * a task
   */
  requestToShowTask: function(performancesData) {
    chrome.tabs.sendMessage(background.currentTabId, {
      action: "showTask",
      performancesData: performancesData
    });
  },

  /**
   * Fire an ajaxError if anything went wrong when sending data from the
   * extension to the server.
   *
   * @param {Object} xhr the type of error that occurred and an optional
   * exception object, if one occurred
   * @param {string} textStatus besides "null" any of "timeout", "error",
   * "abort", "nodata" and "parsererror"
   */
  ajaxError: function(xhr, textStatus) {
    background.requestToCallInitialInteractionState();

    if (!xhr || !textStatus) {
      background.createBasicNotification(
        "no-xhr-or-textstatus-notification",
        "(!xhr || !textStatus)!",
        "The VIEW server encountered an error."
      );
      return;
    }

    switch (textStatus) {
      case "nodata":
        background.createBasicNotification(
          "nodata-notification",
          "No data!",
          "The VIEW server did not send any data."
        );
        break;
      case "no-task-data":
        background.createBasicNotification(
          "no-task-data-notification",
          "No task data!",
          "The VIEW server did not send any task data."
        );
        break;
      case "no-performance-data":
        background.createBasicNotification(
          "no-performance-data-notification",
          "No performance data!",
          "The VIEW server did not send any performance data."
        );
        break;
      case "timeout":
        background.createBasicNotification(
          "timeout-notification",
          "Timeout!",
          "The VIEW server is taking too long to respond."
        );
        break;
      case "error":
        switch (xhr.status) {
          case 400:
            background.createBasicNotification(
              "error-400-notification",
              "Error 400!",
              "The addon sent a bad request to the server. Please ensure you have the latest " +
              "version of the addon and try again. If the problem persists, please file a bug."
            );
            break;
          case 403:
            background.createBasicNotification(
              "error-403-notification",
              "Error 403!",
              "You do not have permission to do this, or your authentication data is invalid."
            );
            break;
          case 404:
            background.createBasicNotification(
              "error-404-notification",
              "Error 404!",
              "The server seems to have vanished. Please notify the server administrator."
            );
            break;
          case 490:
            background.createBasicNotification(
              "error-490-notification",
              "Error 490!",
              "The VIEW server no longer supports this version of the VIEW " +
              "extension.\nPlease check for a new version of the add-on in the " +
              "Tools->Add-ons menu!"
            );
            break;
          case 491:
            background.createBasicNotification(
              "error-491-notification",
              "Error 491!",
              "The topic selected isn't available.\nPlease select a " +
              "different topic from the toolbar menu."
            );
            break;
          case 492:
            background.createBasicNotification(
              "error-492-notification",
              "Error 492!",
              "The topic selected isn't available for the language " +
              "selected.\nPlease select a different language or topic from " +
              "the toolbar menu."
            );
            break;
          case 493:
            background.createBasicNotification(
              "error-493-notification",
              "Error 493!",
              "The server is too busy right now. Please try again " +
              "in a few minutes."
            );
            break;
          case 494:
            // enhancement was stopped on client's request
            break;
          default:
            background.createUnknownErrorNotification();
            break;
        }
        break;
      default:
        background.createUnknownErrorNotification();
        break;
    }
  },

  /**
   * Send a request to the content script to call
   * view.toolbar.initialInteractionState().
   */
  requestToCallInitialInteractionState: function() {
    chrome.tabs.sendMessage(background.currentTabId, {action: "initialInteractionState"});
  },

  /**
   * Create a basic notification containing an id, the
   * "basic" type a title and a message.
   *
   * @param {string} id the id
   * @param {string} title the title
   * @param {string} message the message
   */
  createBasicNotification: function(id, title, message) {
    chrome.notifications.create(
      id, {
        "type": "basic",
        "title": title,
        "message": message,
        "iconUrl": require('./icons/view-96.png')
      });
  },

  /**
   * Create an unknown error notification when no judgement can be made.
   */
  createUnknownErrorNotification: function() {
    background.createBasicNotification(
      "unknown-error-notification",
      "Unknown error!",
      "The VIEW server encountered an unknown error."
    );
  },

  /**
   * Observe the user id cookie when it changes.
   *
   * @param {Object} changeInfo the object containing information
   * whether the cookie was removed, the cookie itself and the
   * reason for its change
   */
  observeUserId: function(changeInfo) {
    if ("wertiview_userid" === changeInfo.cookie.name) {
      background.processUserIdCookie(changeInfo);
    }
  },

  /**
   * Sign in or out the user according to the changes in the
   * user id cookie.
   *
   * @param {Object} changeInfo the object containing information
   * whether the cookie was removed, the cookie itself and the
   * reason for its change
   */
  processUserIdCookie: function(changeInfo) {
    if (changeInfo.removed) {
      background.signOut();
      background.requestToSetAccountInfo();
    }
    else if (changeInfo.cookie.value) {
      background.signIn(changeInfo.cookie.value);
    }
  },

  /**
   * Reset user related information and send a request to the toolbar to
   * sign out the user afterwards.
   */
  signOut: function() {
    chrome.storage.local.set({
      userEmail: "",
      userid: "",
      user: "",
      token: "",
      taskId: ""
    }, background.requestToSignOut);
  },

  /**
   * Send a request to the content script to call view.toolbar.signOut().
   */
  requestToSignOut: function() {
    chrome.tabs.sendMessage(background.currentTabId, {action: "signOut"});
  },

  /**
   * Set user email, user id, and authentication token and send a request to the
   * toolbar to sign in the user.
   *
   * @param {string} userData "/" delimited string with user data:
   * - name
   * - email
   * - id
   * - auth token
   */
  signIn: function(userData) {
    let account;

    try {
      account = JSON.parse(decodeURIComponent(userData));
    } catch(e) {
      background.createBasicNotification(
        "failed-to-parse-cookie",
        "Cookie parse error!",
        "Internal error: failed to parse cookie. Maybe the server format changed." +
        " Please try updating the addon."
      );
      return null;
    }

    const storage = new Storage();
    return storage.get("serverURL")
      .then(data => new ViewServer(data.serverURL))
      .then(server => server.getCustomToken(account.user.token))
      .then(response => storage.set({
        userEmail: account.user.email,
        userid: account.user.uid,
        user: account.user.name,
        token: account.user.token,
        customToken: response.token,
        firebaseData: account.firebase
      }))
      .then(() => background.requestToSignIn(account))
      .then(() => background.requestToSetAccountInfo())
      .catch(e => {
        console.error(e);
        background.createBasicNotification(
          "failed-login",
          "Login error!",
          "Failed to log you in: " + e.message + ". " +
          "More info may be available in the console."
        );
      });
  },

  /**
   * Send a request to the content script to call view.toolbar.signIn().
   */
  requestToSignIn: function(account) {
    chrome.tabs.sendMessage(background.currentTabId, {
      action: "signIn",
      user: account.user.name
    });
  },

  /**
   * Send a request to the content script to call
   * view.accountMenu.setAccountInfo().
   */
  requestToSetAccountInfo: function() {
    chrome.tabs.sendMessage(background.currentTabId, {action: "setAccountInfo"});
  }
};

chrome.runtime.onInstalled.addListener(background.install);
chrome.tabs.onUpdated.addListener(background.onUpdatedTab);
chrome.browserAction.onClicked.addListener(background.clickButton);
chrome.runtime.onMessage.addListener(background.processMessage);
chrome.cookies.onChanged.addListener(background.observeUserId);

export {background}
