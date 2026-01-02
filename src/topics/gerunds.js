/**
 * Gerund Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Gerund (Verbal Adverb) activities.
 * It includes:
 * 1. Filter functions to identify gerunds (Adv + PrsAct/PstAct).
 * 2. Sub-filter functions for Present and Past Active gerunds.
 * 3. Enhancement functions for activities like highlighting and identification.
 */

(function() {
    'use strict';

    // Gerund filter function
    window.FilterFuncs.gerunds = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        // Equivalent to HFSTRusGerundEnhancer logic:
        // Must have Adv reading AND (PrsAct OR PstAct)
        const hasGerundReading = cohort.rs.some(r =>
            r.ts &&
            r.ts.includes('Adv') &&
            (r.ts.includes('PrsAct') || r.ts.includes('PstAct'))
        );

        // Exclude if any reading has one of these tags:
        // +N+, A+, Det, Pron, Pcle, Interj, CC, CS, Pred
        const excludedTags = ['N', 'A', 'Det', 'Pron', 'Pcle', 'Interj', 'CC', 'CS', 'Pred'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        return hasGerundReading && !hasExcludedReading;
    };

    // Sub-filters
    window.SubFilterFuncs["PrsAct"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PrsAct'));
    };

    window.SubFilterFuncs["PstAct"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PstAct'));
    };

    // Enhancement functions
    window.EnhanceFuncs["gerunds-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-gerund`;
        span.style.backgroundColor = 'rgba(255, 165, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["gerunds-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ${isCorrect ? 'ʁ-click-green' : 'ʁ-click-red'}`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        span.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            this.classList.toggle('clicked');
        });

        return span;
    };

    window.EnhanceFuncs["gerunds-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('Adv') && (r.ts.includes('PrsAct') || r.ts.includes('PstAct')));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const baseForm = reading.l;
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-gerund-mc`;
        const select = createMultipleChoiceSelect(originalText);

        generateGerundDistractors(baseForm, reading.ts, originalText).then(options => {
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

    window.EnhanceFuncs["gerunds-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('Adv') && (r.ts.includes('PrsAct') || r.ts.includes('PstAct')));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const lemma = reading.l;
        const wrapper = document.createElement('span');
        wrapper.className = `ʁ ʁ${cohortIndex} ʁ-gerund-cloze-wrapper`;
        const container = document.createElement('span');
        container.className = `ʁ-gerund-cloze`;

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
                    originalText, cohortIndex, 'ʁ-gerund-correct'
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
                const wrapper = this.closest('.ʁ-gerund-cloze-wrapper');
                const cohortIndex = wrapper.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-gerund-correct'
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

    async function generateGerundDistractors(baseForm, originalTags, correctForm) {
        const distractors = [correctForm];
        let tagsString = Array.isArray(originalTags) ? originalTags.join('+') : originalTags;

        const aspects = ['PrsAct', 'PstAct'];

        const aspectTags = ['Impf', 'Perf'];
        const currentAspect = aspectTags.find(t => tagsString.includes(t));

        let baseTags = 'V+Adv';
        if (currentAspect) baseTags += '+' + currentAspect;

        for (const asp of aspects) {
            const newTags = `${baseTags}+${asp}`;
            try {
                const input = `${baseForm}+${newTags}`;
                const generatedForms = await window.generateForms(input);

                if (generatedForms && generatedForms.length > 0) {
                    let distractor = generatedForms[0];
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
