/**
 * Companion-website shim loader.
 *
 * This file is shared by the extension and the website (it lives in docs/rltk/
 * and is symlinked into src/rltk/). sidepanel.html and offscreen.html load it
 * as their first script.
 *
 * In the EXTENSION it is a no-op: chrome.runtime.id is defined, so it returns
 * immediately. On the WEBSITE (plain page, no extension APIs) it loads the
 * config + chrome.* shim BEFORE the app scripts run, so the unmodified
 * extension code can run unchanged. The scripts are written synchronously via
 * document.write so they execute in order before the rest of the document.
 */
(function () {
    'use strict';
    try {
        if (window.chrome && chrome.runtime && chrome.runtime.id) return; // extension: do nothing
    } catch (e) { /* chrome undefined on the web — fall through */ }

    var path = location.pathname;
    var ctx = /offscreen\.html$/.test(path) ? 'offscreen'
            : /sidepanel\.html$/.test(path) ? 'sidepanel'
            : 'content';
    document.write('<script src="../web/config.js"><\/script>');
    document.write('<script src="../web/chrome-shim.js?ctx=' + ctx + '"><\/script>');
})();
