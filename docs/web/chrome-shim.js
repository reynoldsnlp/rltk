/**
 * chrome.* shim for the RLTK companion website.
 *
 * The website runs the *unmodified* extension code (sidepanel.js, content.js,
 * offscreen.js, and the content-script bundle) inside same-origin iframes. Those
 * scripts assume the Chrome extension APIs exist. This shim recreates just enough
 * of `chrome.runtime`, `chrome.tabs`, `chrome.storage`, `chrome.permissions`, and
 * `chrome.offscreen` to make them run on a plain page, and routes messages between
 * the four contexts exactly the way the extension's background.js does.
 *
 * Contexts (all same-origin, so they share one message bus on window.top):
 *   - parent     : index.html (paste UI + model-loading status)
 *   - content    : the "reading page" iframe (content-script bundle annotates text)
 *   - sidepanel  : the real sidepanel.html UI iframe
 *   - offscreen  : the real offscreen.html WASM iframe (hidden)
 *
 * The context is chosen from the `?ctx=` query param on this script's URL
 * (defaults to "parent").
 */
(function () {
    'use strict';

    // ---- Determine which context this shim instance is running in ------------
    var scriptUrl;
    try {
        scriptUrl = (document.currentScript && document.currentScript.src) || '';
    } catch (e) {
        scriptUrl = '';
    }
    var ctx = 'parent';
    try {
        var m = /[?&]ctx=([^&]+)/.exec(scriptUrl);
        if (m) ctx = decodeURIComponent(m[1]);
    } catch (e) { /* keep default */ }

    var RUNTIME_ID = 'rltk-web';
    var TAB_ID = 1;
    var SYNTHETIC_TAB = { id: TAB_ID, url: 'https://rltk.web/reading', active: true, windowId: 1 };

    // Resolve the base URL of the copied extension code (docs/rltk/) from this
    // script's own location (docs/web/chrome-shim.js -> ../rltk/).
    var rltkBase;
    try {
        rltkBase = new URL('../rltk/', scriptUrl).href;
    } catch (e) {
        rltkBase = new URL('rltk/', location.href).href;
    }

    // ---- Shared cross-context message bus (lives on the top window) ----------
    var top = window.top;
    if (!top.__RLTK_BUS__) {
        top.__RLTK_BUS__ = {
            contexts: { parent: [], content: [], sidepanel: [], offscreen: [] },

            // Deliver `message` to every onMessage listener registered in `targetCtx`.
            // Resolves with the first response produced (Chrome's first-responder
            // semantics); resolves undefined if no listener responds.
            dispatch: function (targetCtx, message, sender) {
                var listeners = (this.contexts[targetCtx] || []).slice();
                return new Promise(function (resolve) {
                    var responded = false;
                    var asyncPending = false;
                    function respond(r) {
                        if (!responded) { responded = true; resolve(r); }
                    }
                    for (var i = 0; i < listeners.length; i++) {
                        var ret;
                        try {
                            ret = listeners[i](message, sender, respond);
                        } catch (err) {
                            console.error('[rltk-shim] listener error:', err);
                            continue;
                        }
                        if (ret === true) {
                            asyncPending = true;
                        } else if (ret && typeof ret.then === 'function') {
                            asyncPending = true;
                            ret.then(function (v) { if (v !== undefined) respond(v); }, function () {});
                        }
                    }
                    if (!asyncPending) {
                        Promise.resolve().then(function () { respond(undefined); });
                    }
                });
            },

            // Resolve once at least one listener is registered for `targetCtx`,
            // or reject after `timeoutMs` (mimics "receiving end does not exist").
            ensureContext: function (targetCtx, timeoutMs) {
                var self = this;
                timeoutMs = timeoutMs || 30000;
                if ((self.contexts[targetCtx] || []).length > 0) return Promise.resolve();
                return new Promise(function (resolve, reject) {
                    var waited = 0;
                    var step = 50;
                    var timer = setInterval(function () {
                        if ((self.contexts[targetCtx] || []).length > 0) {
                            clearInterval(timer);
                            resolve();
                        } else if ((waited += step) >= timeoutMs) {
                            clearInterval(timer);
                            reject(new Error('Could not establish connection to "' + targetCtx + '" context'));
                        }
                    }, step);
                });
            }
        };
    }
    var bus = top.__RLTK_BUS__;

    // Fresh registration for this context. When the reading iframe reloads, its
    // new shim instance resets the stale "content" listeners here.
    bus.contexts[ctx] = [];
    var myListeners = bus.contexts[ctx];

    // ---- Action routing (mirrors background.js) ------------------------------
    var OFFSCREEN_ACTIONS = { morph_analysis: 1, generate: 1, analyze_l2: 1, get_model_data: 1, ping_offscreen: 1 };
    var CONTENT_FORWARD_ACTIONS = {
        enhance: 1, abort: 1, restore: 1, get_status: 1,
        get_reading_tutor_status: 1, get_reading_tutor_restore_hash: 1, get_text_hash: 1
    };
    var NOTIFICATION_ACTIONS = {
        selection_state: 1, roots_summary: 1, reading_tutor_dirty: 1,
        reading_tutor_batch_progress: 1, analysis_error: 1, reading_tutor_selection: 1,
        access_granted: 1
    };

    function senderInfo() {
        return { id: RUNTIME_ID, tab: { id: TAB_ID, url: SYNTHETIC_TAB.url }, url: SYNTHETIC_TAB.url };
    }

    function runtimeSendMessage(message) {
        message = message || {};
        var action = message.action;

        // content/sidepanel -> offscreen (WASM). offscreen wraps as {success,data}.
        if (OFFSCREEN_ACTIONS[action]) {
            // Lazily create the offscreen frame (models load on first analysis).
            try { if (typeof top.RLTK_ENSURE_OFFSCREEN === 'function') top.RLTK_ENSURE_OFFSCREEN(); } catch (e) {}
            var fwd = Object.assign({ target: 'offscreen' }, message);
            return bus.ensureContext('offscreen').then(function () {
                return bus.dispatch('offscreen', fwd, senderInfo());
            });
        }

        // sidepanel -> content, with background.js's {success,data} wrapping.
        if (CONTENT_FORWARD_ACTIONS[action]) {
            return bus.ensureContext('content').then(function () {
                return bus.dispatch('content', message, senderInfo());
            }).then(function (response) {
                if (response && response.success === false) {
                    return { success: false, error: response.error || 'Content script operation failed' };
                }
                return { success: true, data: response };
            }, function (err) {
                return { success: false, error: err.message };
            });
        }

        if (action === 'inject_content_script') {
            return bus.ensureContext('content').then(function () {
                return { success: true, tabId: TAB_ID };
            }, function (err) {
                return { success: false, error: err.message };
            });
        }

        // offscreen -> parent: model download progress / failure (status UI).
        if (action === 'model_progress' || action === 'model_error') {
            bus.dispatch('parent', message, senderInfo());
            return Promise.resolve(undefined);
        }

        // content -> sidepanel notifications (fire-and-forget).
        if (NOTIFICATION_ACTIONS[action]) {
            bus.dispatch('sidepanel', message, senderInfo());
            return Promise.resolve(undefined);
        }

        // Unknown: best-effort deliver to the sidepanel.
        bus.dispatch('sidepanel', message, senderInfo());
        return Promise.resolve(undefined);
    }

    // tabs.sendMessage always targets the single reading-page iframe, raw (no wrap).
    function tabsSendMessage(tabId, message) {
        return bus.ensureContext('content').then(function () {
            return bus.dispatch('content', message || {}, senderInfo());
        });
    }

    // ---- Event-listener helper (supports addListener/removeListener) ---------
    function makeEvent(store) {
        return {
            addListener: function (fn) { if (store.indexOf(fn) === -1) store.push(fn); },
            removeListener: function (fn) {
                var i = store.indexOf(fn);
                if (i !== -1) store.splice(i, 1);
            },
            hasListener: function (fn) { return store.indexOf(fn) !== -1; }
        };
    }

    // ---- storage.local backed by localStorage (+ onChanged) ------------------
    var STORAGE_PREFIX = 'rltk-storage:';
    if (!top.__RLTK_STORAGE_LISTENERS__) top.__RLTK_STORAGE_LISTENERS__ = [];
    var storageChangeListeners = top.__RLTK_STORAGE_LISTENERS__;

    function storageRead(key) {
        try {
            var raw = localStorage.getItem(STORAGE_PREFIX + key);
            return raw === null ? undefined : JSON.parse(raw);
        } catch (e) { return undefined; }
    }
    function storageWrite(key, value) {
        var oldValue = storageRead(key);
        try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch (e) {}
        var changes = {}; changes[key] = { oldValue: oldValue, newValue: value };
        for (var i = 0; i < storageChangeListeners.length; i++) {
            try { storageChangeListeners[i](changes, 'local'); } catch (e) {}
        }
    }
    function storageAllKeys() {
        var keys = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(STORAGE_PREFIX) === 0) keys.push(k.slice(STORAGE_PREFIX.length));
            }
        } catch (e) {}
        return keys;
    }

    function makeStorageArea(read, write, allKeys) {
        return {
            get: function (keys, cb) {
                var result = {};
                var list;
                if (keys === null || keys === undefined) {
                    list = allKeys();
                } else if (typeof keys === 'string') {
                    list = [keys];
                } else if (Array.isArray(keys)) {
                    list = keys;
                } else {
                    // object of defaults
                    list = Object.keys(keys);
                    for (var d in keys) { if (keys.hasOwnProperty(d)) result[d] = keys[d]; }
                }
                for (var i = 0; i < list.length; i++) {
                    var v = read(list[i]);
                    if (v !== undefined) result[list[i]] = v;
                }
                if (typeof cb === 'function') { cb(result); return; }
                return Promise.resolve(result);
            },
            set: function (obj, cb) {
                for (var k in obj) { if (obj.hasOwnProperty(k)) write(k, obj[k]); }
                if (typeof cb === 'function') { cb(); return; }
                return Promise.resolve();
            },
            remove: function (keys, cb) {
                var list = Array.isArray(keys) ? keys : [keys];
                for (var i = 0; i < list.length; i++) {
                    try { localStorage.removeItem(STORAGE_PREFIX + list[i]); } catch (e) {}
                }
                if (typeof cb === 'function') { cb(); return; }
                return Promise.resolve();
            },
            clear: function (cb) {
                var ks = allKeys();
                for (var i = 0; i < ks.length; i++) { try { localStorage.removeItem(STORAGE_PREFIX + ks[i]); } catch (e) {} }
                if (typeof cb === 'function') { cb(); return; }
                return Promise.resolve();
            }
        };
    }

    // session storage: in-memory, shared across contexts via top window.
    if (!top.__RLTK_SESSION__) top.__RLTK_SESSION__ = {};
    var sessionStore = top.__RLTK_SESSION__;
    function sessionRead(key) { return sessionStore[key]; }
    function sessionWrite(key, value) { sessionStore[key] = value; }
    function sessionAllKeys() { return Object.keys(sessionStore); }

    // ---- No-op long-lived port (sidepanel lifecycle tracking) ----------------
    function makePort(name) {
        return {
            name: name,
            postMessage: function () {},
            disconnect: function () {},
            onMessage: makeEvent([]),
            onDisconnect: makeEvent([])
        };
    }

    // ---- Assemble window.chrome ---------------------------------------------
    var runtimeOnMessage = makeEvent(myListeners);

    var chromeShim = {
        runtime: {
            id: RUNTIME_ID,
            lastError: undefined,
            sendMessage: function (a, b, c) {
                // Support (message), (message, cb), (extId, message, cb) — we only
                // need the single-arg / message+callback forms in practice.
                var message, cb;
                if (typeof a === 'string' && typeof b === 'object') { message = b; cb = c; }
                else { message = a; cb = (typeof b === 'function') ? b : c; }
                var p = runtimeSendMessage(message);
                if (typeof cb === 'function') { p.then(cb, function () { cb(undefined); }); return; }
                return p;
            },
            onMessage: runtimeOnMessage,
            onConnect: makeEvent([]),
            onInstalled: makeEvent([]),
            connect: function (info) { return makePort((info && info.name) || 'rltk-web'); },
            getURL: function (path) {
                var p = String(path || '');
                if (p.indexOf('rltk/') === 0) p = p.slice('rltk/'.length);
                if (p.charAt(0) === '/') p = p.slice(1);
                try { return new URL(p, rltkBase).href; } catch (e) { return rltkBase + p; }
            },
            getContexts: function () { return Promise.resolve([]); },
            getManifest: function () { return { version: '0.0.0-web', manifest_version: 3 }; }
        },

        tabs: {
            query: function (queryInfo, cb) {
                var res = [SYNTHETIC_TAB];
                if (typeof cb === 'function') { cb(res); return; }
                return Promise.resolve(res);
            },
            get: function (tabId, cb) {
                var res = SYNTHETIC_TAB;
                if (typeof cb === 'function') { cb(res); return; }
                return Promise.resolve(res);
            },
            sendMessage: function (tabId, message, opts, cb) {
                var callback = (typeof opts === 'function') ? opts : cb;
                var p = tabsSendMessage(tabId, message);
                if (typeof callback === 'function') { p.then(callback, function () { callback(undefined); }); return; }
                return p;
            },
            onActivated: makeEvent([]),
            onUpdated: makeEvent([]),
            onRemoved: makeEvent([])
        },

        storage: {
            local: makeStorageArea(storageRead, storageWrite, storageAllKeys),
            session: makeStorageArea(sessionRead, sessionWrite, sessionAllKeys),
            onChanged: makeEvent(storageChangeListeners)
        },

        permissions: {
            request: function (perms, cb) {
                if (typeof cb === 'function') { cb(true); return; }
                return Promise.resolve(true);
            },
            contains: function (perms, cb) {
                if (typeof cb === 'function') { cb(true); return; }
                return Promise.resolve(true);
            }
        },

        // The shim manages the offscreen iframe itself (see bootstrap.js), so these
        // are inert; offscreen.js never calls them.
        offscreen: {
            createDocument: function () { return Promise.resolve(); },
            closeDocument: function () { return Promise.resolve(); },
            hasDocument: function () { return Promise.resolve(true); }
        },

        action: { onClicked: makeEvent([]) },
        sidePanel: {
            setPanelBehavior: function () { return Promise.resolve(); },
            open: function () { return Promise.resolve(); }
        },
        scripting: {
            executeScript: function () { return Promise.resolve([]); },
            insertCSS: function () { return Promise.resolve(); }
        }
    };

    window.chrome = window.chrome || {};
    // Merge so we don't clobber any real chrome.* that might exist.
    for (var key in chromeShim) {
        if (chromeShim.hasOwnProperty(key)) window.chrome[key] = chromeShim[key];
    }

    // ---- Offscreen-only: tell offscreen.js where to fetch remote models ------
    if (ctx === 'offscreen') {
        var cfg = window.RLTK_WEB_CONFIG || (top.RLTK_WEB_CONFIG) || {};
        var modelUrls = (cfg && cfg.MODEL_URLS) || {};
        self.RLTK_RESOLVE_MODEL = function (basename) {
            if (modelUrls[basename] && modelUrls[basename].length) return modelUrls[basename].slice();
            // Fall back to a local copy under docs/rltk/resources/models/.
            return [chromeShim.runtime.getURL('rltk/resources/models/' + basename)];
        };
    }

    // Expose context name for debugging.
    window.__RLTK_CTX__ = ctx;
})();
