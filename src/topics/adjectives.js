(function() {
    'use strict';

    // Adjective filter function
    window.FilterFuncs.adjectives = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts
                && reading.ts.includes('A')) return true;
        }
    };

    // Adjective enhancement functions
    window.EnhanceFuncs["adjectives-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-adjective`;
        span.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["adjectives-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        const isAdjective = window.FilterFuncs.adjectives(cohort);

        span.className = `ʁ ʁ${cohortIndex} ${isAdjective ? 'ʁ-click-green' : 'ʁ-click-red'}`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        span.addEventListener('click', function() {
            this.classList.toggle('clicked');
        });

        return span;
    };

    window.EnhanceFuncs["adjectives-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            console.log('Token not marked as correct, returning plain text');
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        // Validate adjective readings
        if (!validateAdjectiveReadings(cohort)) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs[0];
        const baseForm = reading.l;
        if (!baseForm) {
            console.log('No base form (lemma) found in reading:', reading);
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        console.log('  Creating dropdown for adjective:', { originalText, baseForm, tags: reading.ts });

        // Create the dropdown container
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-adjective-mc`;

        // Create select element using shared utility
        const select = createMultipleChoiceSelect(originalText);

        // Generate distractors asynchronously
        generateDistractors(baseForm, reading.ts, originalText).then(options => {
            populateSelectOptions(select, options);
        }).catch(error => {
            console.error('Error generating distractors:', error);
            container.textContent = originalText;
            return;
        });

        // Handle selection using shared logic
        handleMultipleChoiceSelection(select, container, originalText, cohortIndex);

        container.appendChild(select);
        return container;
    };

    window.EnhanceFuncs["adjectives-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        console.log('adjectives-cloze called with:', { originalText, cohortIndex, isCorrect, cohort });

        if (!isCorrect) {
            console.log('Token not marked as correct, returning plain text');
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        // Validate adjective readings
        if (!validateAdjectiveReadings(cohort)) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs[0];
        const lemma = reading.l;
        if (!lemma) {
            console.log('No lemma found in reading:', reading);
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        console.log('  Creating cloze input for adjective:', { originalText, lemma, tags: reading.ts });

        // Create the cloze container
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-adjective-cloze`;

        // Create prompt and input using shared utilities
        const prompt = window.RLTKUtils.createLemmaPrompt(lemma);
        const input = createClozeInput(originalText);

        container.appendChild(prompt);
        container.appendChild(input);
        return container;
    };

    // Helper functions using shared utilities

    function validateAdjectiveReadings(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) return false;

        const hasNonAdjectiveReading = cohort.rs.some(reading =>
            !reading.ts || !reading.ts.includes('A')
        );

        return !hasNonAdjectiveReading;
    }

    function createMultipleChoiceSelect(originalText) {
        const select = document.createElement('select');
        const width = window.RLTKUtils.getResponsiveWidth(originalText, 1);
        select.style.cssText = window.RLTKUtils.getBaseFormStyles(width);

        // Add stop propagation listeners
        window.RLTKUtils.addStopPropagationListeners(select);

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '?';
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);

        return select;
    }

    function populateSelectOptions(select, options) {
        // Add all options to the select
        options.forEach((form, index) => {
            const optionElement = document.createElement('option');
            optionElement.value = form;
            optionElement.textContent = form;
            optionElement.dataset.isCorrect = index === 0; // First option is correct
            select.appendChild(optionElement);
        });

        // Shuffle options (excluding placeholder)
        const optionElements = Array.from(select.options).slice(1);
        optionElements.sort(() => Math.random() - 0.5);

        // Clear and re-add options
        const placeholder = select.options[0];
        select.innerHTML = '';
        select.appendChild(placeholder);
        optionElements.forEach(opt => select.appendChild(opt));
    }

    function handleMultipleChoiceSelection(select, container, originalText, cohortIndex) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrect = selectedOption.dataset.isCorrect === 'true';

            if (isCorrect) {
                // Correct answer: replace with success span
                const correctSpan = window.RLTKUtils.createSuccessSpan(
                    originalText, cohortIndex, 'ʁ-adjective-correct'
                );
                container.parentNode.replaceChild(correctSpan, container);
            } else {
                // Incorrect answer: show feedback and reset
                window.RLTKUtils.showIncorrectFeedback(this, () => {
                    this.selectedIndex = 0; // Reset to placeholder
                });
            }
        });
    }

    function createClozeInput(originalText) {
        const input = document.createElement('input');
        input.type = 'text';
        const width = window.RLTKUtils.getResponsiveWidth(originalText, 1);
        input.style.cssText = window.RLTKUtils.getBaseFormStyles(width);
        input.placeholder = '?';
        input.dataset.correctAnswer = originalText;

        // Add stop propagation listeners
        window.RLTKUtils.addStopPropagationListeners(input);

        // Add all standard cloze behaviors
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
                const container = this.closest('.ʁ-adjective-cloze');
                const cohortIndex = container.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    // Correct answer: replace with success span
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-adjective-correct'
                    );
                    container.parentNode.replaceChild(correctSpan, container);
                } else if (userInput !== '') {
                    // Show correct answer briefly, then allow retry
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

    // Helper function to generate distractors
    async function generateDistractors(baseForm, originalTags, correctForm) {
        const caseTagsToTry = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];
        const distractors = [correctForm]; // Start with correct form

        // Handle tags as either string or array
        let tagsString = '';
        if (Array.isArray(originalTags)) {
            tagsString = originalTags.join('+');
        } else if (typeof originalTags === 'string') {
            tagsString = originalTags;
        } else {
            console.log('Unexpected tags format:', originalTags);
            return distractors;
        }

        console.log('Tags as string:', tagsString);

        // Find the current case tag in the original tags
        const currentCaseTag = caseTagsToTry.find(tag => tagsString.includes(tag));
        console.log('Current case tag found:', currentCaseTag);

        if (!currentCaseTag) {
            console.log('No case tag found, returning only correct form');
            return distractors;
        }

        // Check if the original form is capitalized
        const isCapitalized = correctForm.length > 0 && correctForm[0] === correctForm[0].toUpperCase();

        // Generate distractors by replacing the case tag
        for (const caseTag of caseTagsToTry) {
            if (caseTag === currentCaseTag) continue; // Skip the correct case

            try {
                const newTags = tagsString.replace(currentCaseTag, caseTag);
                const input = `${baseForm}+${newTags}`;
                console.log('Generating forms for input:', input);
                const generatedForms = await window.generateForms(input);
                console.log('Generated forms result:', generatedForms);

                if (generatedForms && generatedForms.length > 0) {
                    // Use the first generated form as distractor
                    let distractor = generatedForms[0];

                    // Match the capitalization pattern of the original form
                    if (isCapitalized && distractor.length > 0) {
                        distractor = distractor[0].toUpperCase() + distractor.slice(1);
                    } else if (!isCapitalized && distractor.length > 0) {
                        distractor = distractor[0].toLowerCase() + distractor.slice(1);
                    }

                    if (distractor !== correctForm && !distractors.includes(distractor)) {
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
