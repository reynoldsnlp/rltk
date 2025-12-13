(function() {
    'use strict';

    // Assistive reading filter function
    // Accept any token that has readings and is a word
    window.FilterFuncs["assistive-reading"] = function(cohort) {
        return cohort && cohort.w !== undefined && cohort.rs && cohort.rs.length > 0;
    };

    // Assistive reading enhancement function
    window.EnhanceFuncs["assistive-reading-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-assistive`;
        span.textContent = originalText;
        span.style.cursor = 'help';
        span.style.borderBottom = '1px dotted #666';

        span.addEventListener('click', function(e) {
            e.stopPropagation();
            showAnalysis(this, cohort);
        });

        return span;
    };

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
