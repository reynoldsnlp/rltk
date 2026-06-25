/**
 * RLTK companion-website bootstrap (parent context).
 *
 * Wires the three iframes together so the unmodified extension code runs:
 *   - #rltk-offscreen-frame : rltk/offscreen.html (hidden) — eager-loads WASM + models
 *   - #rltk-reading-frame   : the "reading page" — content-script bundle annotates pasted text
 *   - #rltk-sidepanel-frame : rltk/sidepanel.html — the real side-panel UI
 *
 * The content-script bundle is injected into the reading frame the same way
 * background.js injects it into a tab (same file list, same order). After the
 * frame loads we emit an `access_granted` notification — exactly the signal the
 * extension's background sends after injection — so the side panel re-checks
 * access and (re)activates the reading tutor on the new text.
 */
(function () {
    'use strict';

    // The content-script bundle, in the SAME order as background.js
    // (CONTENT_SCRIPT_FILES). Keep in sync if that list changes.
    var CONTENT_SCRIPTS = [
        'utils/misc.js',
        'utils/tokenSelector.js',
        'activities.js',
        'topics/adjectives.js',
        'topics/adverbs.js',
        'topics/aspects.js',
        'topics/reading-tutor.js',
        'topics/cases.js',
        'topics/conjunctions.js',
        'topics/gerunds.js',
        'topics/nouns.js',
        'topics/participles.js',
        'topics/phonetics.js',
        'topics/prepositions.js',
        'topics/pronouns.js',
        'topics/roots.js',
        'topics/stress.js',
        'topics/verbs.js',
        'content.js'
    ];

    // Resolve absolute bases from this script's own URL (docs/web/bootstrap.js).
    var bootstrapUrl = (document.currentScript && document.currentScript.src) || location.href;
    var webBase = new URL('.', bootstrapUrl).href;          // .../docs/web/
    var rltkBase = new URL('../rltk/', bootstrapUrl).href;  // .../docs/rltk/

    function abs(base, p) { return new URL(p, base).href; }
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ---- Build the reading-frame document -----------------------------------
    function readingFrameSrcdoc(text) {
        // NOTE: leave the body empty when there is no text. Any text here would be
        // picked up by the reading tutor and trigger model loading on page load,
        // defeating lazy loading — so the "paste text" hint lives in a parent
        // overlay (#rltk-reading-hint), not inside this frame.
        var paragraphs = String(text || '')
            .split(/\n{2,}/)
            .map(function (block) {
                var inner = block.split(/\n/).map(escapeHtml).join('<br>');
                return inner.trim() ? '<p>' + inner + '</p>' : '';
            })
            .join('\n');

        var headScripts =
            '<link rel="stylesheet" href="' + abs(rltkBase, 'content.css') + '">' +
            '<script src="' + abs(webBase, 'config.js') + '"></script>' +
            '<script src="' + abs(webBase, 'chrome-shim.js') + '?ctx=content"></script>';

        var bodyScripts = CONTENT_SCRIPTS.map(function (f) {
            return '<script src="' + abs(rltkBase, f) + '"></script>';
        }).join('\n');

        return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
            '<style>body{font-family:Georgia,serif;font-size:18px;line-height:1.8;margin:0;padding:24px;color:#1d2b36;}' +
            '.rltk-web-placeholder{color:#7a8b99;font-style:italic;}</style>' +
            headScripts +
            '</head><body>' + paragraphs + '\n' + bodyScripts + '</body></html>';
    }

    function frameLoaded(frame) {
        return new Promise(function (resolve) {
            frame.addEventListener('load', function onload() {
                frame.removeEventListener('load', onload);
                resolve();
            });
        });
    }

    // ---- Model-loading status UI --------------------------------------------
    var statusEl, barEl, barFillEl;
    var cfg = window.RLTK_WEB_CONFIG || {};
    var modelSizes = cfg.MODEL_SIZES || {};
    var modelNames = Object.keys(cfg.MODEL_URLS || {});
    var progress = {}; // name -> {loaded,total}

    function formatMB(bytes) { return (bytes / (1024 * 1024)).toFixed(0) + ' MB'; }

    function showStatusRow() {
        var row = document.getElementById('rltk-status-row');
        if (row) row.style.display = 'flex';
        if (barEl) { barEl.style.display = ''; barEl.classList.remove('rltk-status-done'); }
        if (statusEl) { statusEl.style.display = ''; statusEl.classList.remove('rltk-status-error'); }
    }
    function hideStatusRow() {
        var row = document.getElementById('rltk-status-row');
        if (row) row.style.display = 'none';
    }

    var doneTimer = null;
    var errored = false;
    var modelsReady = false; // set once a batch finishes; gates the "Preparing…" hint

    // A model exhausted every candidate URL. Surface it (don't fail silently in
    // the console) and point users to the browser extension, which ships the
    // models so it works without these downloads.
    function showModelError() {
        errored = true;
        if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
        var row = document.getElementById('rltk-status-row');
        if (row) row.style.display = 'flex';
        if (barEl) { barEl.style.display = 'none'; barEl.classList.remove('rltk-status-done'); }
        if (!statusEl) return;
        statusEl.style.display = '';
        statusEl.classList.add('rltk-status-error');
        statusEl.innerHTML =
            'Couldn’t load a language model (the download server may be ' +
            'unreachable). Installing the ' +
            '<a href="https://chromewebstore.google.com/detail/' +
            'hofbpcgdhdaihhlcjegbfdnmaplnjnco?utm_source=item-share-cb" ' +
            'target="_blank" rel="noopener">RLTK browser extension</a> ' +
            'bundles all the models and lets this website use them directly, ' +
            'so loading is guaranteed to work even when the download server is ' +
            'down. Otherwise, check your connection and use “Refresh models” in ' +
            'the menu to retry.';
    }

    function renderStatus() {
        if (!statusEl || errored) return;

        // Only consider the models that have actually started downloading in the
        // current batch — the primary batch and the on-demand models (L2, g2p)
        // are loaded at different times, so we can't assume a fixed total set.
        var started = Object.keys(progress);
        if (started.length === 0) { hideStatusRow(); return; }

        var loadedSum = 0, totalSum = 0, complete = 0;
        started.forEach(function (name) {
            var p = progress[name];
            var t = p.total || modelSizes[name] || 0;
            loadedSum += p.loaded;
            totalSum += t;
            if ((t && p.loaded >= t) || (p.total === 1 && p.loaded === 1)) complete++;
        });

        var allDone = complete === started.length;

        if (allDone) {
            // Debounce: only declare "ready" if it stays done. A still-downloading
            // model (e.g. the 396 MB tokeniser) reports again and cancels this.
            modelsReady = true;
            statusEl.textContent = 'Language models ready — cached on this device.';
            if (barEl) barEl.classList.add('rltk-status-done');
            if (barFillEl) barFillEl.style.width = '100%';
            if (!doneTimer) doneTimer = setTimeout(hideStatusRow, 2500);
            return;
        }

        if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
        if (barEl) barEl.classList.remove('rltk-status-done');
        var pct = totalSum ? Math.min(99, Math.round((loadedSum / totalSum) * 100)) : 0;
        var sizeNote = totalSum ? '~' + formatMB(totalSum) : 'a few hundred MB';
        statusEl.textContent =
            'Downloading language models (one-time ' + sizeNote + ' — cached on this device, ' +
            'so you won’t download it again)' +
            (totalSum ? ' — ' + formatMB(loadedSum) + ' / ' + formatMB(totalSum) + ' (' + pct + '%)' : '…');
        if (barFillEl) barFillEl.style.width = pct + '%';
    }

    function onModelMessage(message) {
        if (!message) return;
        if (message.action === 'model_error') { showModelError(); return; }
        if (message.action !== 'model_progress') return;
        if (errored) return; // a failure is already shown; don't clobber it
        showStatusRow();
        progress[message.name] = { loaded: message.loaded || 0, total: message.total || 0 };
        renderStatus();
    }

    // ---- Orchestration ------------------------------------------------------
    var readingFrame, sidepanelFrame, offscreenFrame, pasteInput, analyzeBtn;
    var offscreenCreated = false;
    var sidepanelLoaded = false;

    // Lazily create the hidden offscreen frame (which eager-loads the WASM models)
    // only when analysis is actually requested. Exposed on window.top so the shim's
    // offscreen-routing branch can trigger it on the first analysis message.
    function ensureOffscreen() {
        if (offscreenCreated) return;
        offscreenCreated = true;
        offscreenFrame.src = abs(rltkBase, 'offscreen.html');
    }
    window.RLTK_ENSURE_OFFSCREEN = ensureOffscreen;

    // ---- Hamburger menu + "Refresh models" ----------------------------------
    function setupMenu() {
        var btn = document.getElementById('rltk-menu-btn');
        var menu = document.getElementById('rltk-menu-dropdown');
        var refresh = document.getElementById('rltk-refresh-models');
        if (!btn || !menu) return;

        function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
        function toggle() {
            var open = menu.hidden;
            menu.hidden = !open;
            btn.setAttribute('aria-expanded', String(open));
        }
        btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        document.addEventListener('click', function (e) {
            if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

        if (refresh) {
            refresh.addEventListener('click', async function () {
                close();
                try { if (typeof caches !== 'undefined') await caches.delete('rltk-models'); } catch (e) {}
                // Discard the current offscreen context so the (now uncached) models
                // are fetched fresh the next time analysis runs (lazy re-download).
                offscreenCreated = false;
                progress = {};
                errored = false;
                modelsReady = false;
                try { offscreenFrame.src = 'about:blank'; } catch (e) {}
                if (statusEl) {
                    showStatusRow();
                    if (barFillEl) barFillEl.style.width = '0%';
                    statusEl.textContent = 'Model cache cleared — models will re-download next time you analyze.';
                    setTimeout(hideStatusRow, 4000);
                }
            });
        }
    }

    // ---- Draggable splitter between left column and side panel --------------
    var SPLIT_KEY = 'rltk-sidepanel-width';
    var MIN_W = 300; // matches the extension side panel's min-width

    function setupSplitter() {
        var layout = document.querySelector('.rltk-layout');
        var splitter = document.getElementById('rltk-splitter');
        if (!layout || !splitter) return;

        // Restore a previously chosen width.
        try {
            var saved = parseInt(localStorage.getItem(SPLIT_KEY), 10);
            if (saved) applyWidth(saved, layout);
        } catch (e) {}

        function applyWidth(w, lay) {
            var max = Math.max(MIN_W, lay.getBoundingClientRect().width - 360);
            w = Math.min(Math.max(w, MIN_W), max);
            lay.style.setProperty('--rltk-sidepanel-width', w + 'px');
            return w;
        }

        function widthFromEvent(clientX) {
            // Side panel is on the right: width = layout's right edge − cursor X.
            return layout.getBoundingClientRect().right - clientX;
        }

        function onMove(e) {
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            applyWidth(widthFromEvent(clientX), layout);
        }

        function stop() {
            document.body.classList.remove('rltk-resizing');
            splitter.classList.remove('rltk-dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', stop);
            try {
                var w = parseInt(getComputedStyle(layout).getPropertyValue('--rltk-sidepanel-width'), 10);
                if (w) localStorage.setItem(SPLIT_KEY, String(w));
            } catch (e) {}
        }

        function start(e) {
            e.preventDefault();
            document.body.classList.add('rltk-resizing');
            splitter.classList.add('rltk-dragging');
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', stop);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', stop);
        }

        splitter.addEventListener('mousedown', start);
        splitter.addEventListener('touchstart', start, { passive: false });

        // Keyboard resize (separator role).
        splitter.addEventListener('keydown', function (e) {
            var cur = parseInt(getComputedStyle(layout).getPropertyValue('--rltk-sidepanel-width'), 10) || 380;
            if (e.key === 'ArrowLeft') { applyWidth(cur + 24, layout); e.preventDefault(); }
            else if (e.key === 'ArrowRight') { applyWidth(cur - 24, layout); e.preventDefault(); }
            else return;
            try { localStorage.setItem(SPLIT_KEY, getComputedStyle(layout).getPropertyValue('--rltk-sidepanel-width').trim().replace('px', '')); } catch (e2) {}
        });
    }

    function rebuildReadingFrame(text) {
        readingFrame.srcdoc = readingFrameSrcdoc(text);
        return frameLoaded(readingFrame).then(function () {
            // Mirror background.js post-injection signal so the side panel
            // re-checks access and re-activates the reading tutor.
            try { chrome.runtime.sendMessage({ action: 'access_granted', tabId: 1 }); } catch (e) {}
        });
    }

    function init() {
        statusEl = document.getElementById('rltk-model-status');
        barEl = document.getElementById('rltk-model-bar');
        barFillEl = document.getElementById('rltk-model-bar-fill');
        pasteInput = document.getElementById('rltk-paste');
        analyzeBtn = document.getElementById('rltk-analyze');
        readingFrame = document.getElementById('rltk-reading-frame');
        sidepanelFrame = document.getElementById('rltk-sidepanel-frame');
        offscreenFrame = document.getElementById('rltk-offscreen-frame');

        // Wire up the draggable splitter and the hamburger menu.
        setupSplitter();
        setupMenu();

        // Models load lazily (on first analysis), so the status row starts hidden.
        hideStatusRow();

        // Listen for model-download progress/errors from the offscreen context.
        chrome.runtime.onMessage.addListener(function (message) { onModelMessage(message); });

        // When a token is selected in the reading frame, bring the reading pane
        // to the top of the page so the clicked word (and the side panel below it)
        // are in view. Only meaningful on mobile, where the page scrolls; on
        // desktop the body doesn't scroll, so scrollIntoView is a no-op.
        chrome.runtime.onMessage.addListener(function (message) {
            if (!message || message.action !== 'reading_tutor_selection') return;
            if (message.text == null && message.cohort == null) return; // deselection
            var pane = document.querySelector('.rltk-reading-pane');
            if (!pane) return;
            // Stop 8px short so the pane's top margin stays visible (matches the
            // .rltk-reading-pane margin in website.css), rather than flush to the
            // very top of the viewport.
            var PANE_MARGIN = 8;
            window.scrollBy({ top: pane.getBoundingClientRect().top - PANE_MARGIN, behavior: 'smooth' });
        });

        // Build the (empty) reading frame. The side panel and offscreen frame are
        // NOT loaded yet: the side panel auto-analyzes the page on load, which would
        // pull the models. Both are created lazily on the first Analyze instead.
        rebuildReadingFrame('');

        var hint = document.getElementById('rltk-reading-hint');

        // Analyze: render pasted text, then (first time) load the side panel — which
        // activates the reading tutor and triggers model loading on demand.
        analyzeBtn.addEventListener('click', function () {
            // Strip surrounding whitespace before analyzing, and reflect it back
            // into the textarea so what's analyzed matches what the user sees.
            var text = (pasteInput.value || '').trim();
            pasteInput.value = text;
            // Give immediate feedback the instant analysis is requested — before
            // the first byte arrives — so the user always sees that something is
            // happening, even on a slow first byte. Show it whenever the models
            // aren't loaded yet and there's text to analyze (which is what
            // triggers the download). Gating on readiness — not on whether the
            // offscreen frame exists (it's created eagerly on page load) — means
            // this fires on the first real analysis and on a retry after failure,
            // but never leaves a stuck message on a repeat click once models are
            // ready (no progress events would follow to clear it).
            if (text && !modelsReady && statusEl) {
                errored = false;
                statusEl.classList.remove('rltk-status-error');
                showStatusRow();
                statusEl.textContent = 'Preparing language models…';
                if (barFillEl) barFillEl.style.width = '0%';
            }
            ensureOffscreen(); // start loading models now (lazy until first analysis)
            if (hint) hint.style.display = 'none';
            analyzeBtn.disabled = true;
            rebuildReadingFrame(text).then(function () {
                if (!sidepanelLoaded) {
                    sidepanelLoaded = true;
                    sidepanelFrame.src = abs(rltkBase, 'sidepanel.html');
                }
                analyzeBtn.disabled = false;
            }, function () {
                analyzeBtn.disabled = false;
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
