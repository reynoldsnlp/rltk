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

        span.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            // Highlight logic
            document.querySelectorAll('.ʁ-reading-tutor').forEach(el => el.classList.remove('ʁ-highlighted'));
            this.classList.add('ʁ-highlighted');

            const readings = JSON.parse(this.getAttribute('data-readings') || '[]');

            // Send message to side panel with full cohort data
            chrome.runtime.sendMessage({
                action: 'reading_tutor_selection',
                text: originalText,
                cohort: {
                    w: originalText,
                    rs: readings
                }
            });
        });

        return span;
    };

    /**
     * Fetches translations for a given lemma from the background script.
     */
    async function getTranslations(lemma) {
        const response = await chrome.runtime.sendMessage({
            action: 'get_model_data',
            modelName: 'lemmaToTranslationsMap',
            key: lemma
        });

        if (response.success && response.data) {
            const word = response.data;
            let translation = "";
            if (word.senses) {
                word.senses.forEach(sense => {
                    if (sense && sense.glosses) {
                        translation += sense.glosses.join(',') + "; ";
                    }
                });
                if (translation.endsWith("; ")) {
                    translation = translation.substring(0, translation.length - 2);
                }
            }
            return translation;
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
