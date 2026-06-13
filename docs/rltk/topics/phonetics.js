/**
 * Phonetics Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Phonetics activities.
 * It includes:
 * 1. Filter functions to identify words suitable for phonetic exercises (based on POS tags).
 * 2. Helper functions to generate phonetic transcriptions and distractors (incorrect stress placements).
 * 3. Enhancement functions for activities like "Find the Stress" and "Phonetic Transcription".
 */

(function() {
    'use strict';

    // POS Regex from Java implementation
    const posRegex = /^(N|A|V|Pron|Det|Num|Num\+Ord|Abbr|Adv.*|CC|CS|Interj|Paren|Pcle|Po|Pr)$/;

    // Phonetics filter function
    window.FilterFuncs.phonetics = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) return false;
        // Check if any reading matches the POS pattern
        return cohort.rs.some(r => r.ts && r.ts.some(tag => posRegex.test(tag)));
    };

    // Word stress filter function
    window.FilterFuncs["word-stress"] = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    // Helper to get phonetics
    async function getPhonetics(lemma, tags) {
        const input = `${lemma}+${tags.join('+')}`;
        // 1. Get stressed form
        const stressedForms = await window.generateForms(input, 'stress');
        let searchWord = lemma;
        if (stressedForms && stressedForms.length > 0) {
            searchWord = stressedForms[0];
        }

        // 2. Get phonetic transcription
        const phonetics = await window.generateForms(searchWord, 'g2p');
        if (phonetics && phonetics.length > 0) return phonetics[0];
        return null;
    }

    // Helper to generate phonetic distractors
    async function generatePhoneticDistractors(surfaceForm) {
        const vowels = ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'];
        const stressMark = '\u0301';

        // Clean existing stress if any
        const cleanForm = surfaceForm.replace(new RegExp(stressMark, 'g'), '');

        // Handle 'ё' logic: if present, replace with 'е' to allow moving stress
        const baseForm = cleanForm.replace(/ё/g, 'е').replace(/Ё/g, 'Е');

        const stressDistractors = new Set();
        let vowelFound = false;

        for (let i = 0; i < baseForm.length; i++) {
            if (vowels.includes(baseForm[i])) {
                vowelFound = true;
                if (cleanForm[i] === 'ё' || cleanForm[i] === 'Ё') {
                    // 'ё' is always stressed, so this is a valid form (but maybe not a distractor if it's the only one)
                    stressDistractors.add(cleanForm);
                } else {
                    const d = baseForm.substring(0, i + 1) + stressMark + baseForm.substring(i + 1);
                    stressDistractors.add(d);
                }
            }
        }

        if (!vowelFound) return [];

        // Convert stress distractors to phonetics
        const phoneticDistractors = new Set();
        for (const stressDist of stressDistractors) {
            const p = await window.generateForms(stressDist, 'g2p');
            if (p && p.length > 0) {
                phoneticDistractors.add(p[0]);
            }
        }
        return Array.from(phoneticDistractors);
    }

    // Phonetics enhancement functions
    window.EnhanceFuncs["phonetics-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic`;
        span.textContent = originalText; // Placeholder
        span.style.color = '#ff8200'; // Orange from old JSON
        span.style.fontWeight = 'bold';

        (async () => {
            const reading = cohort.rs[0];
            if (!reading) return;
            const phonetic = await getPhonetics(reading.l, reading.ts);
            if (phonetic) {
                span.textContent = phonetic;
            }
        })();
        return span;
    };

    window.EnhanceFuncs["phonetics-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic-hover`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        // Pre-fetch phonetic
        let phonetic = null;
        (async () => {
            const reading = cohort.rs[0];
            if (reading) {
                phonetic = await getPhonetics(reading.l, reading.ts);
            }
        })();

        span.addEventListener('mouseenter', function() {
            if (phonetic) {
                this.textContent = phonetic;
                this.style.color = '#008000'; // Greenish to indicate "correct" or active
            }
        });

        span.addEventListener('mouseleave', function() {
            this.textContent = originalText;
            this.style.color = '';
        });

        return span;
    };

    window.EnhanceFuncs["phonetics-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-phonetic-mc`;
        const select = document.createElement('select');
        const width = window.RLTKUtils.getResponsiveWidth(originalText);
        select.style.cssText = window.RLTKUtils.getBaseFormStyles(width, 'margin-left: 1.2ch;');
        window.RLTKUtils.addStopPropagationListeners(select);

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '?';
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);
        container.appendChild(select);

        (async () => {
            const reading = cohort.rs[0];
            if (!reading) {
                container.textContent = originalText;
                return;
            }

            const correctPhonetic = await getPhonetics(reading.l, reading.ts);
            if (!correctPhonetic) {
                container.textContent = originalText;
                return;
            }

            const distractors = await generatePhoneticDistractors(originalText);

            // Filter out correct answer from distractors if present (to avoid duplicates)
            const uniqueDistractors = distractors.filter(d => d !== correctPhonetic);

            if (uniqueDistractors.length === 0) {
                container.textContent = originalText;
                return;
            }

            const options = [correctPhonetic, ...uniqueDistractors];

            // Populate select
            options.forEach((form, index) => {
                const optionElement = document.createElement('option');
                optionElement.value = form;
                optionElement.textContent = form;
                optionElement.dataset.isCorrect = index === 0; // First one is correct
                select.appendChild(optionElement);
            });

            // Shuffle
            const optionElements = Array.from(select.options).slice(1);
            optionElements.sort(() => Math.random() - 0.5);

            const placeholder = select.options[0];
            select.innerHTML = '';
            select.appendChild(placeholder);
            optionElements.forEach(opt => select.appendChild(opt));

            placeholder.selected = true;
            select.selectedIndex = 0;

            // Handle selection
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (!selectedOption || !selectedOption.value) return;

                const isCorrect = selectedOption.dataset.isCorrect === 'true';
                if (isCorrect) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctPhonetic, cohortIndex, 'ʁ-phonetic-correct'
                    );
                    container.parentNode.replaceChild(correctSpan, container);
                } else {
                    window.RLTKUtils.showIncorrectFeedback(this, () => {
                        this.selectedIndex = 0;
                    });
                }
            });

        })();

        return container;
    };

    // --- Word Stress Functions (Preserved) ---

    window.EnhanceFuncs["word-stress-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress`;
        span.textContent = originalText;
        span.style.fontWeight = 'bold';
        return span;
    };

    window.EnhanceFuncs["word-stress-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Stress: ${originalText}`));
        return span;
    };

})();
