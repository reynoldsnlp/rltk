/**
 * Noun Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Noun activities.
 * It includes:
 * 1. Filter functions to identify nouns in the text.
 * 2. Sub-filter functions for specific noun properties (Singular, Plural).
 * 3. Enhancement functions for different activity types:
 *    - Color: Highlights nouns.
 *    - Click: Interactive click-to-identify.
 *    - Multiple Choice (MC): Replaces nouns with a dropdown of options.
 *    - Cloze: Replaces nouns with a text input field.
 */

(function() {
    'use strict';

    /**
     * Filter function to identify Nouns.
     * Checks if the cohort has a Noun reading and NO readings for other major parts of speech.
     */
    window.FilterFuncs.nouns = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        // Equivalent to the old HFSTRusNounEnhancer logic:
        // Must have a noun reading (+N+) and must NOT have readings for other major POS.
        const hasNounReading = cohort.rs.some(r => r.ts && r.ts.includes('N'));

        // Exclude if any reading has one of these tags:
        // V, A, Det, Pron, Pcle, Adv, Interj, CC, CS, Pred
        const excludedTags = ['V', 'A', 'Det', 'Pron', 'Pcle', 'Adv', 'Interj', 'CC', 'CS', 'Pred'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        return hasNounReading && !hasExcludedReading;
    };

    // Sub-filters for singular and plural
    window.SubFilterFuncs["Sg"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Sg'));
    };

    window.SubFilterFuncs["Pl"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Pl'));
    };


    // Noun enhancement functions
    window.EnhanceFuncs["nouns-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-noun`;
        span.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        span.textContent = originalText;
        const nounReadings = cohort.rs.filter(reading => reading.ts && reading.ts.includes('N'));
        span.setAttribute('data-readings', JSON.stringify(nounReadings));
        return span;
    };

    window.EnhanceFuncs["nouns-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ${isCorrect ? 'ʁ-click-green' : 'ʁ-click-red'}`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        span.addEventListener('click', function() {
            this.classList.toggle('clicked');
        });

        return span;
    };

    window.EnhanceFuncs["nouns-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('N'));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const baseForm = reading.l;
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-noun-mc`;
        const select = createMultipleChoiceSelect(originalText);

        generateDistractors(baseForm, reading.ts, originalText).then(options => {
                const sanitized = sanitizeOptions(options);
                if (sanitized.length <= 1) {
                    container.textContent = originalText;
                    return;
                }
                populateSelectOptions(select, sanitized);
        }).catch(error => {
            console.error('Error generating distractors:', error);
            container.textContent = originalText;
        });

        handleMultipleChoiceSelection(select, container, originalText, cohortIndex);
        container.appendChild(select);
        return container;
    };

    window.EnhanceFuncs["nouns-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('N'));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const lemma = reading.l;
        const wrapper = document.createElement('span');
        wrapper.className = `ʁ ʁ${cohortIndex} ʁ-noun-cloze-wrapper`;
        const container = document.createElement('span');
        container.className = `ʁ-noun-cloze`;

        const prompt = window.RLTKUtils.createLemmaPrompt(lemma);
        const input = createClozeInput(originalText);

        container.appendChild(input);
        wrapper.appendChild(prompt);
        wrapper.appendChild(container);
        return wrapper;
    };

    // Helper functions (similar to adjectives.js)

    function createMultipleChoiceSelect(originalText) {
        const select = document.createElement('select');
        const width = window.RLTKUtils.getResponsiveWidth(originalText);
        select.style.cssText = window.RLTKUtils.getBaseFormStyles(width, 'margin-left: 1.2ch;');
        window.RLTKUtils.addStopPropagationListeners(select);

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '?';
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);
        return select;
    }

    function populateSelectOptions(select, options) {
        options.forEach((form, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = form;
            optionElement.textContent = form;
            optionElement.dataset.isCorrect = index === 0;
            select.appendChild(optionElement);
        });

        const optionElements = Array.from(select.options).slice(1);
        optionElements.sort(() => Math.random() - 0.5);

        const placeholder = select.options[0];
        select.innerHTML = '';
        select.appendChild(placeholder);
        optionElements.forEach(opt => select.appendChild(opt));

        placeholder.selected = true;
        select.selectedIndex = 0;
    }

    function sanitizeOptions(options) {
        const seen = new Set();
        return options
            .map(form => window.RLTKUtils.removeAccents(form))
            .filter(form => {
                if (seen.has(form)) return false;
                seen.add(form);
                return true;
            });
    }

    function handleMultipleChoiceSelection(select, container, originalText, cohortIndex) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrect = selectedOption.dataset.isCorrect === 'true';
            if (isCorrect) {
                const correctSpan = window.RLTKUtils.createSuccessSpan(
                    originalText, cohortIndex, 'ʁ-noun-correct'
                );
                container.parentNode.replaceChild(correctSpan, container);
            } else {
                window.RLTKUtils.showIncorrectFeedback(this, () => {
                    this.selectedIndex = 0;
                });
            }
        });
    }

    function createClozeInput(originalText) {
        const input = document.createElement('input');
        input.type = 'text';
        const width = window.RLTKUtils.getResponsiveWidth(originalText);
        input.style.cssText = window.RLTKUtils.getBaseFormStyles(width);
        input.placeholder = '?';
        input.dataset.correctAnswer = originalText;
        window.RLTKUtils.addStopPropagationListeners(input);
        addClozeInputValidation(input);
        addClozeEnterKeyHandler(input);
        addClozeFocusHandlers(input);
        return input;
    }

    function addClozeInputValidation(input) {
        input.addEventListener('input', function() {
            const userInput = this.value.trim();
            const correctAnswer = this.dataset.correctAnswer;
            if (userInput === '') {
                this.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                return;
            }
            if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                this.style.borderColor = '#4CAF50';
            } else {
                this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                this.style.borderColor = '#f44336';
            }
        });
    }

    function addClozeEnterKeyHandler(input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const userInput = this.value.trim();
                const correctAnswer = this.dataset.correctAnswer;
                const wrapper = this.closest('.ʁ-noun-cloze-wrapper');
                const cohortIndex = wrapper.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-noun-correct'
                    );
                    wrapper.parentNode.replaceChild(correctSpan, wrapper);
                } else if (userInput !== '') {
                    const originalValue = this.value;
                    this.value = correctAnswer;
                    this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                    this.style.borderColor = '#4CAF50';
                    this.disabled = true;
                    setTimeout(() => {
                        this.value = originalValue;
                        this.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                        this.style.borderColor = '#ccc';
                        this.disabled = false;
                        this.focus();
                    }, 1500);
                }
            }
        });
    }

    function addClozeFocusHandlers(input) {
        input.addEventListener('focus', function() {
            if (this.style.backgroundColor !== 'rgba(0, 255, 0, 0.3)') {
                this.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
            }
        });
        input.addEventListener('blur', function() {
            if (this.style.backgroundColor !== 'rgba(0, 255, 0, 0.3)' &&
                this.style.backgroundColor !== 'rgba(255, 0, 0, 0.3)') {
                this.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            }
        });
    }

    async function generateDistractors(baseForm, originalTags, correctForm) {
        const caseTags = ["Nom", "Acc", "Gen", "Loc", "Dat", "Ins", "Voc"];
        const specialCaseTags = ["Gen2", "Loc2"]; // Must be checked before their counterparts
        const allCaseTags = [...specialCaseTags, ...caseTags.filter(t => !specialCaseTags.includes(t))];

        const distractors = [correctForm];
        let tagsString = Array.isArray(originalTags) ? originalTags.join('+') : originalTags;

        const numberTag = tagsString.includes('Sg') ? 'Sg' : 'Pl';
        const currentCaseTag = allCaseTags.find(tag => tagsString.includes(tag));

        if (!currentCaseTag) {
            return distractors;
        }

        const capType = window.RLTKUtils.detectCapitalization(correctForm);

        for (const caseTag of allCaseTags) {
            if (caseTag === currentCaseTag) continue;

            try {
                // Reconstruct tags, replacing only the case within the correct number
                const otherTags = tagsString.split('+').filter(t => t !== currentCaseTag && t !== 'Sg' && t !== 'Pl').join('+');
                const newTags = `${otherTags}+${numberTag}+${caseTag}`;
                const input = `${baseForm}+${newTags}`;
                const generatedForms = await window.generateForms(input);

                if (generatedForms && generatedForms.length > 0) {
                    let distractor = generatedForms[0];
                    distractor = window.RLTKUtils.matchCapitalization(distractor, capType);

                    // Normalize for comparison (remove accents)
                    const normDistractor = window.RLTKUtils.removeAccents(distractor);
                    const normCorrect = window.RLTKUtils.removeAccents(correctForm);

                    // Check if distractor is different from correct form (ignoring accents)
                    // And check if we haven't already added this distractor (ignoring accents)
                    const isDuplicate = distractors.some(d => window.RLTKUtils.removeAccents(d) === normDistractor);

                    if (normDistractor !== normCorrect && !isDuplicate) {
                        distractors.push(distractor);
                    }
                }
            } catch (error) {
                console.error(`Error generating distractor for case ${caseTag}:`, error);
            }
        }

        return distractors;
    }
})();
