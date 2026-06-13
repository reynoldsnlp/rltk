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
        var paragraphs = String(text || '')
            .split(/\n{2,}/)
            .map(function (block) {
                var inner = block.split(/\n/).map(escapeHtml).join('<br>');
                return inner.trim() ? '<p>' + inner + '</p>' : '';
            })
            .join('\n');
        if (!paragraphs) {
            paragraphs = '<p class="rltk-web-placeholder">Paste Russian text above and press “Analyze”.</p>';
        }

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

    function renderStatus() {
        if (!statusEl) return;
        var loadedSum = 0, totalSum = 0, complete = 0;
        modelNames.forEach(function (name) {
            var p = progress[name];
            var sizeGuess = modelSizes[name] || 0;
            if (p) {
                loadedSum += p.loaded;
                var t = p.total || sizeGuess;
                totalSum += t;
                if (t && p.loaded >= t) complete++;
                else if (p.total === 1 && p.loaded === 1) { complete++; } // cache hit
            } else {
                totalSum += sizeGuess;
            }
        });

        if (complete >= modelNames.length && modelNames.length > 0) {
            statusEl.textContent = 'Language models ready.';
            if (barEl) barEl.classList.add('rltk-status-done');
            setTimeout(function () {
                if (barEl) barEl.style.display = 'none';
                if (statusEl) statusEl.style.display = 'none';
            }, 1500);
            return;
        }

        var pct = totalSum ? Math.min(99, Math.round((loadedSum / totalSum) * 100)) : 0;
        statusEl.textContent = 'Loading language models… ' +
            (totalSum ? (formatMB(loadedSum) + ' / ' + formatMB(totalSum) + ' (' + pct + '%)')
                      : 'this happens once and may take a while');
        if (barFillEl) barFillEl.style.width = pct + '%';
    }

    function onModelProgress(message) {
        if (!message || message.action !== 'model_progress') return;
        progress[message.name] = { loaded: message.loaded || 0, total: message.total || 0 };
        renderStatus();
    }

    // ---- Orchestration ------------------------------------------------------
    var readingFrame, sidepanelFrame, offscreenFrame, pasteInput, analyzeBtn;

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

        // Listen for model-download progress from the offscreen context.
        chrome.runtime.onMessage.addListener(function (message) { onModelProgress(message); });

        // 1. Start the hidden offscreen frame → eager WASM + model load begins.
        offscreenFrame.src = abs(rltkBase, 'offscreen.html');
        renderStatus();

        // 2. Build the (empty) reading frame, then 3. load the side panel.
        rebuildReadingFrame('').then(function () {
            sidepanelFrame.src = abs(rltkBase, 'sidepanel.html');
        });

        // Analyze: render pasted text and re-run the content-script bundle.
        analyzeBtn.addEventListener('click', function () {
            var text = pasteInput.value || '';
            analyzeBtn.disabled = true;
            rebuildReadingFrame(text).then(function () {
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
