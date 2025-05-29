import FirebaseAdapter from '../../firebaseAdapter.js';

const view = {
  url: document.baseURI,
  title: document.title,

  /**
   * Set all items from storage.
   * Afterwards add the toolbar.
   */
  setStorageItemsAndAddToolbar: function() {
    chrome.storage.local.get(function(storageItems) {
      view.setItems(storageItems);

      view.toolbar.add();
    });
  },

  /**
   * Set all given items to view.
   *
   * @param {object} items the items to set
   */
  setItems: function(items) {
    const allItems = Object.keys(items);

    for (const item of allItems) {
      view[item] = items[item];
    }
  },

  /**
   * Get the user token
   */
  getToken: async function() {
    return FirebaseAdapter.getToken();
  },

  /**
   * Set all changes from the storage to view.
   *
   * @param {object} changes the changes made to the storage
   */
  setStorageChange: function(changes) {
    const changedItems = Object.keys(changes);

    for (const item of changedItems) {
      view[item] = changes[item].newValue;
    }
  }
};

/* VIEW components */
view.about = require('./about.js');
view.assessment = require('./assessment.js');
view.blur = require('./blur.js');
view.selector = require('./selector.js');

/* VIEW components with dependencies */
view.accountMenu = require('./account-menu.js')(view);
view.container = require('./container.js')(view);
view.enhancer = require('./enhancer.js')(view);
view.feedbacker = require('./feedbacker.js')(view);
view.lib = require('./lib.js')(view);
view.notification = require('./notification.js')(view);
view.statisticsMenu = require('./statistics-menu.js')(view);
view.toolbar = require('./toolbar.js')(view);
view.VIEWmenu = require('./view-menu.js')(view);

/* Activities */
view.activityHelper = require('./activities/activityHelper.js')(view);
view.assistiveReading = require('./activities/assistiveReading/assistiveReading.js')(view);
view.paradigmTables = require('./activities/assistiveReading/paradigms.js')(view);
view.click = require('./activities/click.js')(view);
view.mc = require('./activities/mc.js')(view);
view.cloze = require('./activities/cloze.js')(view);
view.color = require('./activities/color.js')(view);
view.tracker = require('./activities/tracker.js')(view);

export default view;
