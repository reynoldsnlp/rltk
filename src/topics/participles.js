/**
 * Participle Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Participle activities.
 * It includes:
 * 1. Loading a list of adjectives to exclude from participle identification.
 * 2. Filter functions to identify participles (V + PrsAct/PrsPss/PstAct/PstPss).
 * 3. Sub-filter functions for different participle types.
 * 4. Enhancement functions for activities like highlighting and identification.
 */

(function() {
    'use strict';

    let excludedAdjectives = new Set();
    (async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'get_model_data',
                modelName: 'adjectivesToExcludeFromParticiples',
                key: 'all'
            });
            if (response.success && response.data) {
                response.data.forEach(adj => excludedAdjectives.add(adj));
            }
        } catch (e) {
            console.error("Failed to load excluded adjectives", e);
        }
    })();

    // Participle filter function
    window.FilterFuncs.participles = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        // Equivalent to HFSTRusParticipleEnhancer logic:
        // Must have V reading AND (PrsAct OR PrsPss OR PstAct OR PstPss)
        const hasParticipleReading = cohort.rs.some(r =>
            r.ts &&
            r.ts.includes('V') &&
            (r.ts.includes('PrsAct') || r.ts.includes('PrsPss') || r.ts.includes('PstAct') || r.ts.includes('PstPss'))
        );

        // Exclude if any reading has one of these tags:
        // +N+, Det, Pred, Adv
        // Note: A+ is NOT excluded.
        const excludedTags = ['N', 'Det', 'Pred', 'Adv'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        if (!hasParticipleReading || hasExcludedReading) {
            return false;
        }

        // Exclude if lemma is in excludedAdjectives
        const hasExcludedLemma = cohort.rs.some(r => r.l && excludedAdjectives.has(r.l));
        if (hasExcludedLemma) return false;

        // Ambiguity check
        if (isAmbiguous(cohort)) {
            return false;
        }

        return true;
    };

    function isAmbiguous(cohort) {
        // Collect all tags from all readings
        const allTags = new Set();
        cohort.rs.forEach(r => {
            if (r.ts) r.ts.forEach(t => allTags.add(t));
        });

        const hasSg = allTags.has('Sg');
        const hasPl = allTags.has('Pl');

        if (hasSg && hasPl) {
            return true;
        } else if (hasSg) {
            if (allTags.has('Gen') && allTags.has('Acc')) {
                return true;
            }
            return false;
        } else if (hasPl) {
            if (allTags.has('AnIn') && allTags.has('Acc')) {
                return true;
            } else if ((allTags.has('Gen') || (allTags.has('Acc') && allTags.has('Anim'))) && allTags.has('Loc')) {
                return true;
            }
            return false;
        } else {
            // If neither Sg nor Pl, assume ambiguous or invalid?
            // Java code returns true if neither Sg nor Pl found (else block).
            return true;
        }
    }

    // Sub-filters
    window.SubFilterFuncs["PrsAct"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PrsAct'));
    };
    window.SubFilterFuncs["PrsPss"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PrsPss'));
    };
    window.SubFilterFuncs["PstAct"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PstAct'));
    };
    window.SubFilterFuncs["PstPss"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('PstPss'));
    };

    // Enhancement functions
    window.EnhanceFuncs["participles-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-participle`;
        span.style.backgroundColor = 'rgba(128, 0, 128, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["participles-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
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

    window.EnhanceFuncs["participles-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('V') && (r.ts.includes('PrsAct') || r.ts.includes('PrsPss') || r.ts.includes('PstAct') || r.ts.includes('PstPss')));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const baseForm = reading.l;
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-participle-mc`;
        const select = createMultipleChoiceSelect(originalText);

        generateParticipleDistractors(baseForm, reading.ts, originalText).then(options => {
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

    window.EnhanceFuncs["participles-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs.find(r => r.ts && r.ts.includes('V') && (r.ts.includes('PrsAct') || r.ts.includes('PrsPss') || r.ts.includes('PstAct') || r.ts.includes('PstPss')));
        if (!reading || !reading.l) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const lemma = reading.l;
        const wrapper = document.createElement('span');
        wrapper.className = `ʁ ʁ${cohortIndex} ʁ-participle-cloze-wrapper`;
        const container = document.createElement('span');
        container.className = `ʁ-participle-cloze`;

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
                    originalText, cohortIndex, 'ʁ-participle-correct'
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
                const wrapper = this.closest('.ʁ-participle-cloze-wrapper');
                const cohortIndex = wrapper.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-participle-correct'
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

    async function generateParticipleDistractors(baseForm, originalTags, correctForm) {
        const distractors = [correctForm];
        let tagsString = Array.isArray(originalTags) ? originalTags.join('+') : originalTags;

        const types = ['PrsAct', 'PrsPss', 'PstAct', 'PstPss'];

        const genderTags = ['Msc', 'Fem', 'Neu'];
        const numberTags = ['Sg', 'Pl'];
        const caseTags = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];

        const currentGender = genderTags.find(t => tagsString.includes(t));
        const currentNumber = numberTags.find(t => tagsString.includes(t));
        const currentCase = caseTags.find(t => tagsString.includes(t));

        let baseTags = 'V';
        if (currentGender) baseTags += '+' + currentGender;
        if (currentNumber) baseTags += '+' + currentNumber;
        if (currentCase) baseTags += '+' + currentCase;

        for (const type of types) {
            const newTags = `${baseTags}+${type}`;
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
