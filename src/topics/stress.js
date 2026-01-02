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
                span.style.cursor = 'default';
            } else if (analysis.status === 'ambiguous') {
                span.style.cursor = 'help';
                span.title = createAmbiguousTooltip(analysis);
            } else {
                span.style.cursor = 'not-allowed';
            }
        })();

        return span;
    };

    // 2. Click Activity: Split into letters, click vowel to check stress
    window.EnhanceFuncs["word-stress-click"] = function(originalText, cohort, cohortIndex) {
        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-stress-click`;

        const vowels = ['а','е','ё','и','о','у','ы','э','ю','я','А','Е','Ё','И','О','У','Ы','Э','Ю','Я'];
        const isVowel = (ch) => vowels.includes(ch);

        // Store state
        let stressState = { status: 'loading', form: null };

        // Create inline content: wrap vowels only, leave consonants/plain text unwrapped
        const letters = [];
        for (let i = 0; i < originalText.length; i++) {
            const ch = originalText[i];
            if (isVowel(ch)) {
                const letterSpan = document.createElement('span');
                letterSpan.textContent = ch;
                letterSpan.className = 'letter';
                letterSpan.dataset.index = String(i);
                letterSpan.style.cursor = 'default';

                letterSpan.addEventListener('mouseenter', function() {
                    if (stressState.status === 'known') {
                        this.style.cursor = 'pointer';
                        this.style.backgroundColor = 'rgba(0,0,0,0.08)';
                    } else if (stressState.status === 'ambiguous') {
                        this.style.cursor = 'help';
                        this.style.backgroundColor = '';
                    } else if (stressState.status === 'unknown') {
                        this.style.cursor = 'not-allowed';
                        this.style.backgroundColor = '';
                    }
                });

                letterSpan.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = '';
                });

                // Click handler
                letterSpan.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (stressState.status !== 'known') return; // Only allow clicking if known/unambiguous

                    const correctForm = stressState.form;
                    const targetIndex = Number(this.dataset.index);

                    let cleanIndex = 0;
                    let stressedIndex = 0;
                    let found = false;

                    while (stressedIndex < correctForm.length && cleanIndex <= targetIndex) {
                        if (correctForm[stressedIndex] === '\u0301') {
                            stressedIndex++;
                        } else {
                            if (cleanIndex === targetIndex) {
                                found = true;
                                break;
                            }
                            cleanIndex++;
                            stressedIndex++;
                        }
                    }

                    if (!found) return;

                    const isStressed = (stressedIndex + 1 < correctForm.length) && (correctForm[stressedIndex + 1] === '\u0301');

                    if (isStressed) {
                        this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                        letters.forEach(l => l.style.pointerEvents = 'none');

                        const capType = window.RLTKUtils.detectCapitalization(originalText);
                        const finalForm = window.RLTKUtils.matchCapitalization(correctForm, capType);
                        container.classList.add('click-style-correct');
                        container.classList.remove('click-style-incorrect');

                        setTimeout(() => {
                            container.textContent = finalForm;
                            container.style.cursor = 'default';
                        }, 400);
                    } else {
                        const originalBg = this.style.backgroundColor;
                        this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                        setTimeout(() => {
                            this.style.backgroundColor = originalBg || '';
                        }, 400);
                    }
                });

                container.appendChild(letterSpan);
                letters.push(letterSpan);
            } else {
                container.appendChild(document.createTextNode(ch));
            }
        }

        (async () => {
            const analysis = await analyzeStress(originalText, cohort);
            if (analysis.status === 'unambiguous') {
                stressState.status = 'known';
                stressState.form = analysis.form;
                letters.forEach(l => l.style.cursor = 'pointer');
            } else if (analysis.status === 'ambiguous') {
                stressState.status = 'ambiguous';
                container.title = createAmbiguousTooltip(analysis);
                letters.forEach(l => l.style.cursor = 'help');
            } else {
                stressState.status = 'unknown';
                letters.forEach(l => l.style.cursor = 'not-allowed');
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
                span.style.cursor = 'default';
            } else if (analysisResult && analysisResult.status === 'ambiguous') {
                span.style.cursor = 'help';
            } else if (analysisResult && analysisResult.status === 'unknown') {
                span.style.cursor = 'not-allowed';
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
                span.style.cursor = 'help';
            } else if (analysisResult.status === 'unknown') {
                span.style.cursor = 'not-allowed';
            } else {
                span.style.cursor = 'default';
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
