import view from './view.js';

/**
 * Processes all messages received from background.js.
 * Sends requests to backround.js or handles requests here.
 */
function processMessage(request) {
  switch (request.action) {
    case "toggleToolbar":
      view.toolbar.toggleToolbar();
      break;
    case "addBlur":
      view.blur.add(request.html);
      break;
    case "setAccountInfo":
      view.accountMenu.setAccountInfo();
      break;
    case "initialInteractionState":
      view.toolbar.initialInteractionState();
      break;
    case "addEnhancementMarkup":
      view.enhancer.addEnhancementMarkup(request.data);
      break;
    case "showFeedback":
      view.feedbacker.showFeedback(request.submissionResponseData);
      break;
    case "showAllTasks":
      view.statisticsMenu.showAllTasks(request.tasksData);
      break;
    case "showTask":
      view.statisticsMenu.showTask(request.performancesData);
      break;
    case "signIn":
      view.toolbar.signIn(request.user);
      break;
    case "signOut":
      view.toolbar.signOut();
  }
}

chrome.runtime.onMessage.addListener(processMessage);
chrome.storage.onChanged.addListener(view.setStorageChange);
