(function() {
    'use strict';

    // Word stress filter function
    window.FilterFuncs["word-stress"] = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }
        // Exclude punctuation
        const punctTags = ['SENT', 'COMMA', 'DASH', 'QUOT', 'PAR', 'PUNCT', 'CLB'];
        const hasPunct = cohort.rs.some(r => r.ts && r.ts.some(tag => punctTags.includes(tag)));

        return !hasPunct;
    };

    // Helper to get the stressed form
    async function getStressedForm(originalText, cohort) {
        // Try to find a reading with stress
        for (const r of cohort.rs) {
            if (!r.ts) continue;
            const tags = Array.isArray(r.ts) ? r.ts.join('+') : r.ts;
            const input = `${r.l}+${tags}`;
            try {
                const forms = await window.generateForms(input, true); // true for useStress
                if (forms && forms.length > 0) {
                    return forms[0];
                }
            } catch (e) {
                console.error(e);
            }
        }
        return null;
    }

    // 1. Color Activity: Replace text with stressed form
    window.EnhanceFuncs["word-stress-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress`;
        span.textContent = originalText; // Placeholder

        (async () => {
            const stressedForm = await getStressedForm(originalText, cohort);
            if (stressedForm && stressedForm !== originalText) {
                const capType = window.RLTKUtils.detectCapitalization(originalText);
                span.textContent = window.RLTKUtils.matchCapitalization(stressedForm, capType);
            }
        })();

        return span;
    };

    // 2. Click Activity: Split into letters, click vowel to check stress
    window.EnhanceFuncs["word-stress-click"] = function(originalText, cohort, cohortIndex) {
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-stress-click`;

        // Store state
        let stressState = { status: 'loading', form: null };

        // Create letters
        const letters = [];
        for (let i = 0; i < originalText.length; i++) {
            const letterSpan = document.createElement('span');
            letterSpan.textContent = originalText[i];
            letterSpan.className = 'letter';
            letterSpan.style.cursor = 'pointer';

            // Mouse events for unknown stress
            letterSpan.addEventListener('mousedown', function(e) {
                if (stressState.status === 'unknown') {
                    this.style.cursor = 'help';
                }
            });

            letterSpan.addEventListener('mouseup', function(e) {
                if (stressState.status === 'unknown') {
                    this.style.cursor = 'pointer';
                }
            });

            letterSpan.addEventListener('mouseleave', function(e) {
                this.style.cursor = 'pointer';
            });

            // Click handler
            letterSpan.addEventListener('click', function(e) {
                e.stopPropagation();
                if (stressState.status === 'loading') return; // Not ready yet
                if (stressState.status === 'unknown') return; // Handled by mousedown
                if (stressState.status === 'solved') return; // Already solved

                const correctForm = stressState.form;

                // Logic: check if correctForm has stress after this index
                // We map the clicked letter index to the correctForm index.

                let cleanIndex = 0;
                let stressedIndex = 0;
                let found = false;

                // We want to find the position in correctForm that corresponds to `index` in originalText.
                while (stressedIndex < correctForm.length && cleanIndex <= i) {
                    if (correctForm[stressedIndex] === '\u0301') {
                        stressedIndex++; // Skip stress mark in correctForm
                    } else {
                        if (cleanIndex === i) {
                            found = true;
                            break;
                        }
                        cleanIndex++;
                        stressedIndex++;
                    }
                }

                if (found) {
                    // Check if the NEXT char in correctForm is stress
                    const isStressed = (stressedIndex + 1 < correctForm.length) && (correctForm[stressedIndex + 1] === '\u0301');

                    if (isStressed) {
                        // Correct!
                        stressState.status = 'solved';

                        // Flash the clicked letter green
                        const originalBg = this.style.backgroundColor;
                        this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                        setTimeout(() => {
                            this.style.backgroundColor = originalBg || '';
                        }, 500);

                        // Update ALL letters to show stress
                        let cIdx = 0;
                        for (let lIdx = 0; lIdx < letters.length; lIdx++) {
                            // Skip stress marks in correctForm to align with letters
                            while (cIdx < correctForm.length && correctForm[cIdx] === '\u0301') {
                                cIdx++;
                            }

                            if (cIdx < correctForm.length) {
                                // Check if this position has stress in correctForm
                                if (cIdx + 1 < correctForm.length && correctForm[cIdx + 1] === '\u0301') {
                                    letters[lIdx].textContent += '\u0301';
                                }
                                cIdx++;
                            }
                        }

                        container.classList.add('click-style-correct');
                        container.classList.remove('click-style-incorrect');
                        container.style.cursor = 'default';
                        letters.forEach(l => l.style.cursor = 'default');

                    } else {
                        // Incorrect - flash red on the specific letter
                        const originalBg = this.style.backgroundColor;
                        this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                        setTimeout(() => {
                            this.style.backgroundColor = originalBg || '';
                        }, 500);
                    }
                }
            });

            container.appendChild(letterSpan);
            letters.push(letterSpan);
        }

        (async () => {
            const form = await getStressedForm(originalText, cohort);
            stressState.status = form ? 'known' : 'unknown';
            stressState.form = form;
        })();

        return container;
    };

    // 3. Cloze Activity: Hover to reveal stress
    window.EnhanceFuncs["word-stress-cloze"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress-cloze`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        let correctForm = null;

        span.addEventListener('mouseenter', function() {
            if (correctForm) {
                const capType = window.RLTKUtils.detectCapitalization(originalText);
                span.textContent = window.RLTKUtils.matchCapitalization(correctForm, capType);
                span.classList.add('click-style-correct');
            }
        });

        span.addEventListener('mouseleave', function() {
            span.textContent = originalText;
            span.classList.remove('click-style-correct');
        });

        (async () => {
            correctForm = await getStressedForm(originalText, cohort);
        })();

        return span;
    };

    // 4. Multiple Choice Activity
    function generateStressDistractors(surfaceForm) {
        const vowels = ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'];
        const stressMark = '\u0301';

        // Remove existing stress
        const cleanForm = surfaceForm.replace(new RegExp(stressMark, 'g'), '');

        // Normalize ё/Ё to е/Е for generating distractors (legacy logic)
        const baseForm = cleanForm.replace(/ё/g, 'е').replace(/Ё/g, 'Е');

        const distractors = new Set();

        for (let i = 0; i < baseForm.length; i++) {
            if (vowels.includes(baseForm[i])) {
                // If it's ё/Ё, it's always stressed (legacy logic adds it as is)
                if (cleanForm[i] === 'ё' || cleanForm[i] === 'Ё') {
                    distractors.add(cleanForm);
                } else {
                    // Add stress to this vowel
                    // We need to reconstruct the form with stress at position i
                    // But baseForm has normalized chars. We should use cleanForm but be careful.
                    // Actually, if we normalized, we might have lost info.
                    // But the legacy logic was: "move stress to every vowel".

                    // Let's just iterate the cleanForm.
                    const char = cleanForm[i];
                    if (vowels.includes(char)) {
                         const distractor = cleanForm.substring(0, i + 1) + stressMark + cleanForm.substring(i + 1);
                         distractors.add(distractor);
                    }
                }
            }
        }

        return Array.from(distractors);
    }

    window.EnhanceFuncs["word-stress-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        // If isCorrect is false (distractor), we don't need to do anything special for stress MC
        // because the distractors are generated inside the target element's logic in this new architecture?
        // Wait, the new architecture calls this function for targets AND distractors?
        // No, usually only for targets.
        // But let's check the signature.
        // If isCorrect is provided and false, it means this function is called to render a distractor?
        // No, usually EnhanceFuncs are called to render the *replacement* for the original text.

        // In the previous file content:
        // window.EnhanceFuncs["word-stress-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        //    if (!isCorrect) { ... return span; }

        // This suggests the framework might call this with isCorrect=false?
        // But usually for MC, we create a <select> element.

        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-stress-mc`;

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
            const correctForm = await getStressedForm(originalText, cohort);

            const distractors = generateStressDistractors(correctForm);

            // Filter out duplicates and ensure correct form is there
            const options = [correctForm];
            distractors.forEach(d => {
                if (d !== correctForm && !options.includes(d)) {
                    options.push(d);
                }
            });

            if (options.length <= 1) {
                container.textContent = originalText;
                return;
            }

            // Populate select
            const capType = window.RLTKUtils.detectCapitalization(originalText);
            options.forEach((form, index) => {
                const optionElement = document.createElement('option');
                const cappedForm = window.RLTKUtils.matchCapitalization(form, capType);
                optionElement.value = cappedForm;
                optionElement.textContent = cappedForm;
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
                        window.RLTKUtils.matchCapitalization(correctForm, capType), cohortIndex, 'ʁ-stress-correct'
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

})();
