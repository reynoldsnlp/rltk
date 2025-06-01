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
        console.log('adjectives-mc called with:', { originalText, cohortIndex, isCorrect, cohort });

        if (!isCorrect) {
            console.log('Token not marked as correct, returning plain text');
            // For non-target words, just return the original text
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        // Check if this adjective has exactly one reading with an "A" tag
        if (!cohort.rs || cohort.rs.length !== 1) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = cohort.rs[0];
        if (!reading.ts || !reading.ts.includes('A')) {
            console.log('Reading does not contain "A" tag:', reading.ts);
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        // Extract the base form and generate distractors
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

        const select = document.createElement('select');
        select.style.cssText = `
            background-color: rgba(255, 255, 0, 0.3);
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 2px;
            font-family: inherit;
            font-size: inherit;
        `;

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '?';
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);

        // Generate distractors asynchronously
        generateDistractors(baseForm, reading.ts, originalText).then(options => {
            console.log('Generated options:', options);
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
            select.innerHTML = '';
            select.appendChild(placeholderOption);
            optionElements.forEach(opt => select.appendChild(opt));

        }).catch(error => {
            console.error('Error generating distractors:', error);
            // Fallback: just show the original text
            container.textContent = originalText;
            return;
        });

        // Handle selection
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrect = selectedOption.dataset.isCorrect === 'true';

            if (isCorrect) {
                // Correct answer: replace with green text
                const correctSpan = document.createElement('span');
                correctSpan.textContent = originalText;
                correctSpan.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                correctSpan.className = `ʁ ʁ${cohortIndex} ʁ-adjective-correct`;
                container.parentNode.replaceChild(correctSpan, container);
            } else {
                // Incorrect answer: flash red, then reset
                this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                setTimeout(() => {
                    this.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                    this.selectedIndex = 0; // Reset to placeholder
                }, 1000);
            }
        });

        container.appendChild(select);
        return container;
    };

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
                    const distractor = generatedForms[0];
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
