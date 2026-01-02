/**
 * Verb Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Verb activities.
 * It includes:
 * 1. Filter functions to identify verbs in the text.
 * 2. Sub-filter functions for specific verb properties (Imperfective, Perfective).
 * 3. Enhancement functions for different activity types:
 *    - Color: Highlights verbs.
 *    - Click: Interactive click-to-identify.
 *    - Multiple Choice (MC): Replaces verbs with a dropdown of options.
 *    - Cloze: Replaces verbs with a text input field.
 */

(function() {
    'use strict';

    /**
     * Filter function to identify Verbs.
     * Checks if the cohort has a Verb reading and NO readings for other major parts of speech
     * that might conflict (like Nouns or Participles).
     */
    window.FilterFuncs.verbs = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        // Equivalent to HFSTRusVerbEnhancer logic:
        // Must have a verb reading (V+)
        const hasVerbReading = cohort.rs.some(r => r.ts && r.ts.includes('V'));

        // Exclude if any reading has one of these tags:
        // +N+, PstAct, PstPss, PrsAct, PrsPss
        const excludedTags = ['N', 'PstAct', 'PstPss', 'PrsAct', 'PrsPss'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        return hasVerbReading && !hasExcludedReading;
    };

    // Sub-filters for Impf and Perf
    window.SubFilterFuncs["Impf"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Impf'));
    };

    window.SubFilterFuncs["Perf"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Perf'));
    };

    // Verb enhancement functions
    window.EnhanceFuncs["verbs-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb`;
        span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verbs-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ${isCorrect ? 'ʁ-click-green' : 'ʁ-click-red'}`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        span.addEventListener('click', function() {
            this.classList.toggle('clicked');
        });

        return span;
    };

    window.EnhanceFuncs["verbs-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('V'));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const baseForm = reading.l;
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-verb-mc`;
        const select = createMultipleChoiceSelect(originalText);

        generateVerbDistractors(baseForm, reading.ts, originalText).then(options => {
            if (options.length <= 1) {
                container.textContent = originalText;
                return;
            }
            populateSelectOptions(select, options);
        }).catch(error => {
            console.error('Error generating distractors:', error);
            container.textContent = originalText;
        });

        handleMultipleChoiceSelection(select, container, originalText, cohortIndex);
        container.appendChild(select);
        return container;
    };

    window.EnhanceFuncs["verbs-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('V'));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const lemma = reading.l;
        const wrapper = document.createElement('span');
        wrapper.className = `ʁ ʁ${cohortIndex} ʁ-verb-cloze-wrapper`;
        const container = document.createElement('span');
        container.className = `ʁ-verb-cloze`;

        const prompt = window.RLTKUtils.createLemmaPrompt(lemma);
        const input = createClozeInput(originalText);

        container.appendChild(input);
        wrapper.appendChild(prompt);
        wrapper.appendChild(container);
        return wrapper;
    };

    // Helper functions
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

    function handleMultipleChoiceSelection(select, container, originalText, cohortIndex) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrect = selectedOption.dataset.isCorrect === 'true';
            if (isCorrect) {
                const correctSpan = window.RLTKUtils.createSuccessSpan(
                    originalText, cohortIndex, 'ʁ-verb-correct'
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
                const wrapper = this.closest('.ʁ-verb-cloze-wrapper');
                const cohortIndex = wrapper.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-verb-correct'
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

    async function generateVerbDistractors(baseForm, originalTags, correctForm) {
        const distractors = [correctForm];
        let tagsString = Array.isArray(originalTags) ? originalTags.join('+') : originalTags;

        const persons = ['Sg1', 'Sg2', 'Sg3', 'Pl1', 'Pl2', 'Pl3'];

        const tenseTags = ['Pres', 'Past', 'Fut'];
        const aspectTags = ['Impf', 'Perf'];
        const moodTags = ['Ind', 'Imp', 'Inf'];

        const currentTense = tenseTags.find(t => tagsString.includes(t));
        const currentAspect = aspectTags.find(t => tagsString.includes(t));
        const currentMood = moodTags.find(t => tagsString.includes(t));

        if (currentMood === 'Inf') {
            return distractors;
        }

        let baseTags = 'V';
        if (currentAspect) baseTags += '+' + currentAspect;
        if (currentMood) baseTags += '+' + currentMood;
        if (currentTense) baseTags += '+' + currentTense;

        for (const pers of persons) {
            const newTags = `${baseTags}+${pers}`;
            try {
                const input = `${baseForm}+${newTags}`;
                const generatedForms = await window.generateForms(input);

                if (generatedForms && generatedForms.length > 0) {
                    let distractor = generatedForms[0];
                    // Handle capitalization
                    const capType = window.RLTKUtils.detectCapitalization(correctForm);
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
            } catch (e) {
                // ignore
            }
        }

        return distractors;
    }

})();
