/**
 * Reading Tutor Topic Logic for RLTK Extension
 *
 * This file defines the logic for the "Reading Tutor" mode.
 * It includes:
 * 1. A broad filter that accepts most words.
 * 2. Enhancement logic that makes words clickable to show morphological analysis and translations.
 * 3. Helper functions to fetch translations from the background script.
 */

(function() {
    'use strict';

    let currentStressMode = 'none'; // 'none' | 'mark' | 'hover'

    /**
     * Scroll the minimum amount needed to make `el` fully visible, scrolling ONLY
     * within its own document's scroll container. Deliberately avoids
     * Element.scrollIntoView(), which also scrolls ancestor frames — on the
     * website the reading content is an iframe, and we must not scroll the
     * embedding page. A no-op when `el` is already visible or nothing can scroll.
     */
    function ensureSpanVisible(el) {
        const doc = el.ownerDocument;
        const view = doc.defaultView;
        let node = el.parentElement;
        let container = null;
        while (node && node !== doc.body && node !== doc.documentElement) {
            const oy = view.getComputedStyle(node).overflowY;
            if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
                container = node;
                break;
            }
            node = node.parentElement;
        }
        const er = el.getBoundingClientRect();
        if (container) {
            const cr = container.getBoundingClientRect();
            if (er.top < cr.top) container.scrollTop += er.top - cr.top;
            else if (er.bottom > cr.bottom) container.scrollTop += er.bottom - cr.bottom;
        } else {
            const se = doc.scrollingElement || doc.documentElement;
            const vh = view.innerHeight || doc.documentElement.clientHeight;
            if (er.top < 0) se.scrollTop += er.top;
            else if (er.bottom > vh) se.scrollTop += er.bottom - vh;
        }
    }

    /**
     * Resolve the stressed text to display in a span.
     *
     * When a word is split across multiple DOM nodes (e.g. sites that wrap each
     * character in its own element), each fragment is its own span but shares the
     * whole word's stressed `form`. Showing `form` in every fragment repeats the
     * whole word once per fragment, so return only this fragment's slice. Falls
     * back to the fragment's own text (no accent) rather than repeating the word
     * if the form can't be aligned to the token.
     */
    function stressDisplayForm(span, form, originalText) {
        const tokenText = span.dataset.tokenText;
        if (tokenText === undefined || tokenText === originalText) return form;
        const offset = parseInt(span.dataset.tokenOffset || '0', 10);
        const slice = window.rltkStress && window.rltkStress.sliceFormForFragment
            ? window.rltkStress.sliceFormForFragment(form, tokenText, offset, originalText)
            : null;
        return slice !== null ? slice : originalText;
    }

    function applyStressModeToSpan(span, mode) {
        if (span.__rltkStressEnter) {
            span.removeEventListener('mouseenter', span.__rltkStressEnter);
            span.__rltkStressEnter = null;
        }
        if (span.__rltkStressLeave) {
            span.removeEventListener('mouseleave', span.__rltkStressLeave);
            span.__rltkStressLeave = null;
        }

        const originalText = span.dataset.originalText;
        if (originalText !== undefined) span.textContent = originalText;
        span.classList.remove('click-style-correct');
        span.removeAttribute('title');
        span.style.cursor = 'pointer';

        if (mode === 'none') return;

        const status  = span.dataset.stressStatus;
        const form    = span.dataset.stressForm;
        const tooltip = span.dataset.stressTooltip;

        if (!status || status === 'loading') return;

        if (mode === 'mark') {
            if (status === 'unambiguous' && form) {
                const cap = window.RLTKUtils.detectCapitalization(originalText);
                span.textContent = window.RLTKUtils.matchCapitalization(stressDisplayForm(span, form, originalText), cap);
            } else if (status === 'ambiguous') {
                span.style.cursor = 'help';
                if (tooltip) span.title = tooltip;
            } else {
                span.style.cursor = 'not-allowed';
            }
        } else if (mode === 'hover') {
            if (status === 'ambiguous') {
                span.style.cursor = 'help';
                if (tooltip) span.title = tooltip;
            } else if (status === 'unknown') {
                span.style.cursor = 'not-allowed';
            }
            if (status === 'unambiguous' && form && originalText !== undefined) {
                const cap = window.RLTKUtils.detectCapitalization(originalText);
                const cappedForm = window.RLTKUtils.matchCapitalization(stressDisplayForm(span, form, originalText), cap);
                const enterHandler = () => {
                    span.textContent = cappedForm;
                    span.classList.add('click-style-correct');
                };
                const leaveHandler = () => {
                    span.textContent = originalText;
                    span.classList.remove('click-style-correct');
                };
                span.addEventListener('mouseenter', enterHandler);
                span.addEventListener('mouseleave', leaveHandler);
                span.__rltkStressEnter = enterHandler;
                span.__rltkStressLeave = leaveHandler;
            }
        }
    }

    window.setReadingTutorStressMode = function(mode) {
        currentStressMode = mode || 'none';
        document.querySelectorAll('.ʁ-reading-tutor').forEach(span => {
            applyStressModeToSpan(span, currentStressMode);
        });
    };

    // Reading Tutor filter function
    // Accept any token that has readings and is a word
    window.FilterFuncs["reading-tutor"] = function(cohort) {
        return cohort && cohort.w !== undefined && cohort.rs && cohort.rs.length > 0;
    };

    // Reading Tutor enhancement function
    window.EnhanceFuncs["reading-tutor-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-reading-tutor`;
        span.textContent = originalText;
        span.style.cursor = 'help';
        span.style.borderBottom = '1px dotted #666';

        span.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            showAnalysis(this, cohort);
        });

        return span;
    };

    // Reading Tutor enhancement function
    window.EnhanceFuncs["reading-tutor-explore"] = function(originalText, cohort, cohortIndex) {
        // Inject styles if not already present
        if (!document.getElementById('rltk-reading-tutor-styles')) {
            const style = document.createElement('style');
            style.id = 'rltk-reading-tutor-styles';
            style.textContent = `
                .ʁ-reading-tutor.ʁ-highlighted {
                    background-color: #fff3cd;
                    border-bottom: 2px solid #ffc107;
                }
            `;
            document.head.appendChild(style);
        }

        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-reading-tutor`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        // span.style.borderBottom = '1px dotted #2c5aa0'; // Optional styling

        // Add tag classes for Grammar Highlighter view
        const readings = cohort.rs || [];
        if (readings.length > 0) {
            const allTagsCount = {};
            readings.forEach(r => {
                (r.ts || []).forEach(tag => {
                    // Filter out weight tags if any
                    if (!tag.startsWith('<W:')) {
                        allTagsCount[tag] = (allTagsCount[tag] || 0) + 1;
                    }
                });
            });

            for (const [tag, count] of Object.entries(allTagsCount)) {
                if (count === readings.length) {
                    span.classList.add(`rltk-tag-${tag}`);
                } else {
                    span.classList.add(`rltk-tag-${tag}-tentative`);
                }
            }
        }

        // Store readings in data attribute
        span.setAttribute('data-readings', JSON.stringify(cohort.rs || []));

        // Pre-compute stress asynchronously and cache on span
        span.dataset.originalText = originalText;
        span.dataset.stressStatus = 'loading';
        if (window.rltkStress) {
            (async () => {
                const analysis = await window.rltkStress.analyzeStress(originalText, cohort);
                span.dataset.stressStatus = analysis.status;
                if (analysis.status === 'unambiguous') {
                    span.dataset.stressForm = analysis.form;
                } else if (analysis.status === 'ambiguous') {
                    span.dataset.stressTooltip = window.rltkStress.createAmbiguousTooltip(analysis);
                }
                if (currentStressMode !== 'none') {
                    applyStressModeToSpan(span, currentStressMode);
                }
            })();
        }

        span.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            const selectionState = window.__rltkReadingTutorSelection || { element: null, index: null };
            window.__rltkReadingTutorSelection = selectionState;

            // A word may be split across several spans (sites that wrap each
            // character in its own element). Every fragment shares the
            // ʁ<cohortIndex> class, so highlight the whole word together rather
            // than just the clicked fragment.
            const wordSpans = window.RLTKUtils.getReadingTutorWordSpans(cohortIndex);
            const group = wordSpans.length ? wordSpans : [this];

            if (this.classList.contains('ʁ-highlighted')) {
                group.forEach(s => s.classList.remove('ʁ-highlighted'));
                if (selectionState.index === cohortIndex) {
                    selectionState.element = null;
                    selectionState.index = null;
                }
                chrome.runtime.sendMessage({
                    action: 'reading_tutor_selection',
                    text: null,
                    cohort: null,
                    index: null
                });
            } else {
                // Clear any previously selected word (which may also be a group).
                if (selectionState.index !== null && selectionState.index !== undefined && selectionState.index !== cohortIndex) {
                    window.RLTKUtils.getReadingTutorWordSpans(selectionState.index)
                        .forEach(s => s.classList.remove('ʁ-highlighted'));
                } else if (selectionState.element && selectionState.element !== this) {
                    selectionState.element.classList.remove('ʁ-highlighted');
                }
                group.forEach(s => s.classList.add('ʁ-highlighted'));
                // Keep the highlighted word fully visible within the reading area
                // itself (not the embedding page). No-op when already visible.
                ensureSpanVisible(this);
                selectionState.element = this;
                selectionState.index = cohortIndex;

                const readings = JSON.parse(this.getAttribute('data-readings') || '[]');

                // For words split across multiple nodes, this fragment carries the
                // whole word in data-token-text; use it so the panel shows the word.
                const word = this.dataset.tokenText || originalText;

                // Send message to side panel with full cohort data
                chrome.runtime.sendMessage({
                    action: 'reading_tutor_selection',
                    text: word,
                    cohort: {
                        w: word,
                        rs: readings
                    },
                    index: cohortIndex
                });
            }
        });

        return span;
    };

    /**
     * Fetches translations for a given lemma from the background script.
     */
    async function getTranslations(lemma) {
        const response = await chrome.runtime.sendMessage({
            action: 'get_model_data',
            modelName: 'openrussian-translations-eng',
            key: lemma
        });

        if (response.success && response.data) {
            const word = response.data;

            // Shipped format: lemma -> { pos: "<span class=...>..." }
            // Extract the human-readable gloss from the HTML.
            const extractGlossFromHtml = (html) => {
                if (typeof html !== 'string') return null;
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const spans = Array.from(doc.querySelectorAll('span')).filter(s => !s.classList.contains('rltk-pos'));
                const parts = spans.map(s => (s.textContent || '').trim()).filter(Boolean);
                const text = (parts.length ? parts.join(' ') : (doc.body.textContent || ''))
                    .replace(/\s*🔊\s*/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return text || null;
            };

            if (word && typeof word === 'object') {
                const byPos = Object.values(word).map(extractGlossFromHtml).filter(Boolean);
                return byPos.length ? byPos.join('; ') : null;
            }
        }
        return null;
    }

    function showAnalysis(element, cohort) {
        // Remove existing tooltips
        const existing = document.querySelectorAll('.ʁ-tooltip');
        existing.forEach(el => el.remove());

        const tooltip = document.createElement('div');
        tooltip.className = 'ʁ-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            color: #333;
            text-align: left;
        `;

        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        title.textContent = cohort.w;
        tooltip.appendChild(title);

        const list = document.createElement('ul');
        list.style.paddingLeft = '20px';
        list.style.margin = '0';

        // Process readings
        const uniqueLemmas = new Set();
        cohort.rs.forEach(r => {
            if (r.l) uniqueLemmas.add(r.l);
        });

        // Fetch translations for all unique lemmas
        const translationPromises = Array.from(uniqueLemmas).map(async lemma => {
            const trans = await getTranslations(lemma);
            return { lemma, trans };
        });

        Promise.all(translationPromises).then(results => {
            const translationsMap = {};
            results.forEach(res => {
                if (res.trans) translationsMap[res.lemma] = res.trans;
            });

            cohort.rs.forEach(r => {
                const item = document.createElement('li');
                const lemma = r.l || '?';
                const tags = Array.isArray(r.ts) ? r.ts.join(' ') : r.ts;

                let text = `${lemma} (${tags})`;
                if (translationsMap[lemma]) {
                    text += `: ${translationsMap[lemma]}`;
                }

                item.textContent = text;
                list.appendChild(item);
            });
        });

        tooltip.appendChild(list);

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

        // Close on click outside
        const closeHandler = function(e) {
            if (!tooltip.contains(e.target) && e.target !== element) {
                tooltip.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }
})();
