/**
 * Stress Topic Logic for RLTK Extension
 *
 * This file defines the filtering and enhancement logic for Word Stress activities.
 * It includes:
 * 1. Filter functions to identify words suitable for stress exercises (excluding punctuation).
 * 2. Helper functions to retrieve stressed forms from the generator.
 * 3. Enhancement functions for activities like "Show Stress" and "Find the Stress".
 */

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

    // Helper to analyze stress ambiguity
    async function analyzeStress(originalText, cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return { status: 'unknown', forms: [] };
        }

        const stressMap = new Map(); // stressedForm -> list of readings {lemma, tags}
        const allReadings = [];

        for (const r of cohort.rs) {
            if (!r.ts) continue;
            const tags = Array.isArray(r.ts) ? r.ts.join('+') : r.ts;
            const input = `${r.l}+${tags}`;
            try {
                const forms = await window.generateForms(input, true);
                if (forms && forms.length > 0) {
                    const stressedForm = forms[0];
                    if (!stressMap.has(stressedForm)) {
                        stressMap.set(stressedForm, []);
                    }
                    const readingInfo = { lemma: r.l, tags: Array.isArray(r.ts) ? r.ts : [r.ts] };
                    stressMap.get(stressedForm).push(readingInfo);
                    allReadings.push(readingInfo);
                }
            } catch (e) {
                console.error(e);
            }
        }

        const uniqueForms = Array.from(stressMap.keys());

        if (uniqueForms.length === 0) {
            return { status: 'unknown', forms: [] };
        } else if (uniqueForms.length === 1) {
            return { status: 'unambiguous', form: uniqueForms[0] };
        } else {
            // Ambiguous
            return {
                status: 'ambiguous',
                forms: uniqueForms,
                details: stressMap,
                allReadings: allReadings
            };
        }
    }

    function getCommonTags(readings) {
        if (!readings || readings.length === 0) return [];
        let common = new Set(readings[0].tags);
        for (let i = 1; i < readings.length; i++) {
            const currentTags = new Set(readings[i].tags);
            for (const tag of common) {
                if (!currentTags.has(tag)) {
                    common.delete(tag);
                }
            }
        }
        return Array.from(common);
    }

    function createAmbiguousTooltip(analysis) {
        const commonTags = getCommonTags(analysis.allReadings);
        let tooltipLines = [];
        for (const [form, readings] of analysis.details.entries()) {
            for (const r of readings) {
                const uniqueTags = r.tags.filter(t => !commonTags.includes(t));
                const tagStr = uniqueTags.join('+');
                tooltipLines.push(`${r.lemma}+${tagStr} -> ${form}`);
            }
        }
        return tooltipLines.join('\n');
    }

    // 1. Color Activity: Replace text with stressed form
    window.EnhanceFuncs["word-stress-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress`;
        span.textContent = originalText; // Placeholder

        (async () => {
            const analysis = await analyzeStress(originalText, cohort);
            if (analysis.status === 'unambiguous') {
                const stressedForm = analysis.form;
                if (stressedForm && stressedForm !== originalText) {
                    const capType = window.RLTKUtils.detectCapitalization(originalText);
                    span.textContent = window.RLTKUtils.matchCapitalization(stressedForm, capType);
                }
            } else {
                // Ambiguous or unknown
                span.style.cursor = 'help';
                if (analysis.status === 'ambiguous') {
                    span.title = createAmbiguousTooltip(analysis);
                }
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
            letterSpan.style.cursor = 'default'; // Default until loaded

            // Mouse events for unknown/ambiguous stress
            letterSpan.addEventListener('mouseenter', function(e) {
                if (stressState.status === 'ambiguous' || stressState.status === 'unknown') {
                    this.style.cursor = 'help';
                } else if (stressState.status === 'known') {
                    this.style.cursor = 'pointer';
                }
            });

            // Click handler
            letterSpan.addEventListener('click', function(e) {
                e.stopPropagation();
                if (stressState.status !== 'known') return; // Only allow clicking if known/unambiguous

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
            const analysis = await analyzeStress(originalText, cohort);
            if (analysis.status === 'unambiguous') {
                stressState.status = 'known';
                stressState.form = analysis.form;
                letters.forEach(l => l.style.cursor = 'pointer');
            } else {
                stressState.status = analysis.status;
                if (analysis.status === 'ambiguous') {
                    container.title = createAmbiguousTooltip(analysis);
                }
                letters.forEach(l => l.style.cursor = 'help');
            }
        })();

        return container;
    };

    // 3. Hover Activity: Reveal stress on hover
    window.EnhanceFuncs["word-stress-hover"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress-hover`;
        span.textContent = originalText;

        let analysisResult = null;

        span.addEventListener('mouseenter', function() {
            if (analysisResult && analysisResult.status === 'unambiguous') {
                const capType = window.RLTKUtils.detectCapitalization(originalText);
                span.textContent = window.RLTKUtils.matchCapitalization(analysisResult.form, capType);
                span.classList.add('click-style-correct');
                span.style.cursor = 'pointer';
            } else if (analysisResult) {
                span.style.cursor = 'help';
            }
        });

        span.addEventListener('mouseleave', function() {
            span.textContent = originalText;
            span.classList.remove('click-style-correct');
        });

        (async () => {
            analysisResult = await analyzeStress(originalText, cohort);
            if (analysisResult.status === 'ambiguous') {
                span.title = createAmbiguousTooltip(analysisResult);
            }
        })();

        return span;
    };

    // Backward compatibility alias (if any config still requests cloze for word-stress)
    window.EnhanceFuncs["word-stress-cloze"] = window.EnhanceFuncs["word-stress-hover"];

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

    window.EnhanceFuncs["word-stress-mc"] = function(originalText, cohort, cohortIndex) {
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-stress-mc`;
        container.textContent = originalText;

        (async () => {
            const analysis = await analyzeStress(originalText, cohort);

            if (analysis.status !== 'unambiguous') {
                // If ambiguous or unknown, just leave as text
                if (analysis.status === 'ambiguous') {
                     container.style.cursor = 'help';
                     container.title = createAmbiguousTooltip(analysis);
                } else if (analysis.status === 'unknown') {
                     container.style.cursor = 'help';
                }
                return;
            }

            const correctForm = analysis.form;

            const select = document.createElement('select');
            const width = window.RLTKUtils.getResponsiveWidth(originalText);
            select.style.cssText = window.RLTKUtils.getBaseFormStyles(width, 'margin-left: 1.2ch;');
            window.RLTKUtils.addStopPropagationListeners(select);

            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = '?';
            placeholderOption.selected = true;
            select.appendChild(placeholderOption);

            const distractors = generateStressDistractors(correctForm);

            // Filter out duplicates and ensure correct form is there
            const options = [correctForm];
            distractors.forEach(d => {
                if (d !== correctForm && !options.includes(d)) {
                    options.push(d);
                }
            });

            if (options.length <= 1) {
                // Should not happen if there are vowels, but just in case
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

            container.textContent = '';
            container.appendChild(select);

        })();

        return container;
    };

})();
