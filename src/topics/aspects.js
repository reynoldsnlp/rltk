/**
 * Verb Aspect Topic Logic for RLTK Extension
 *
 * This file defines the logic for Verb Aspect activities (Imperfective vs Perfective).
 * It includes:
 * 1. Initialization logic to load aspect pair maps (Impf <-> Perf).
 * 2. Filter functions to identify verbs with aspect pairs.
 * 3. Enhancement functions for activities like identifying aspect or swapping aspect pairs.
 */

(function() {
    'use strict';

    window.TopicInitFuncs = window.TopicInitFuncs || {};

    let impfToPerfMap = null;
    let perfToImpfMap = null;

    /**
     * Initializes the aspect topic by loading the aspect pair maps from the background script.
     */
    window.TopicInitFuncs["verb-aspect-pairs"] = async function() {
        if (impfToPerfMap && perfToImpfMap) return;

        try {
            const [impfData, perfData] = await Promise.all([
                chrome.runtime.sendMessage({ target: 'offscreen', action: 'get_model_data', modelName: 'imperfectiveToPerfectiveVerbMap' }),
                chrome.runtime.sendMessage({ target: 'offscreen', action: 'get_model_data', modelName: 'perfectiveToImperfectiveVerbMap' })
            ]);

            if (impfData.success) impfToPerfMap = impfData.data;
            if (perfData.success) perfToImpfMap = perfData.data;

            console.log("Aspect maps loaded");
        } catch (e) {
            console.error("Failed to load aspect maps", e);
        }
    };

    /**
     * Helper to extract the verb reading from a cohort.
     */
    function getVerbReading(cohort) {
        if (!cohort.rs) return null;
        return cohort.rs.find(r =>
            r.ts &&
            r.ts.includes('V') &&
            (r.ts.includes('Impf') || r.ts.includes('Perf'))
        );
    }

    /**
     * Checks if a lemma has a known aspect pair.
     */
    function hasPair(lemma) {
        if (!lemma) return false;
        // Remove stress marks if any (simple check)
        const cleanLemma = lemma.replace('́', '');
        return (impfToPerfMap && impfToPerfMap[cleanLemma]) || (perfToImpfMap && perfToImpfMap[cleanLemma]);
    }

    // Verb aspect filters
    window.FilterFuncs["verb-aspect-pairs"] = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        const reading = getVerbReading(cohort);
        if (!reading) return false;

        // Exclude if any reading has one of these tags:
        // +N+, PstAct, PstPss, PrsAct, PrsPss
        const excludedTags = ['N', 'PstAct', 'PstPss', 'PrsAct', 'PrsPss'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        if (hasExcludedReading) return false;

        // Must have a pair in the maps
        return hasPair(reading.l);
    };

    // Aspect subfilters
    window.SubFilterFuncs["Impf"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Impf'));
    };

    window.SubFilterFuncs["Perf"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Perf'));
    };

    // Verb tense filters
    window.FilterFuncs["verb-tense"] = function(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) {
            return false;
        }

        // Must have V reading AND (Pst OR Prs OR Fut)
        const hasVerbReading = cohort.rs.some(r =>
            r.ts &&
            r.ts.includes('V') &&
            (r.ts.includes('Pst') || r.ts.includes('Prs') || r.ts.includes('Fut'))
        );

        // Exclude if any reading has one of these tags:
        // +N+, PstAct, PstPss, PrsAct, PrsPss
        const excludedTags = ['N', 'PstAct', 'PstPss', 'PrsAct', 'PrsPss'];
        const hasExcludedReading = cohort.rs.some(r => r.ts && r.ts.some(tag => excludedTags.includes(tag)));

        return hasVerbReading && !hasExcludedReading;
    };

    // Tense subfilters
    window.SubFilterFuncs["Pst"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Pst'));
    };

    window.SubFilterFuncs["Prs"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Prs'));
    };

    window.SubFilterFuncs["Fut"] = function(cohort) {
        return cohort.rs.some(r => r.ts && r.ts.includes('Fut'));
    };

    // Enhancement functions for verb-aspect-pairs
    window.EnhanceFuncs["verb-aspect-pairs-color"] = function(originalText, cohort, cohortIndex) {
        const reading = getVerbReading(cohort);
        const isPerf = reading && reading.ts.includes('Perf');

        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-aspect`;
        // Different colors for Perf vs Impf
        if (isPerf) {
            span.style.backgroundColor = 'rgba(255, 165, 0, 0.3)'; // Orange-ish for Perfective
        } else {
            span.style.backgroundColor = 'rgba(0, 128, 128, 0.3)'; // Teal-ish for Imperfective
        }
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verb-aspect-pairs-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
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

    window.EnhanceFuncs["verb-aspect-pairs-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = getVerbReading(cohort);
        if (!reading) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-aspect-mc`;

        const select = createMultipleChoiceSelect(originalText);

        generateAspectDistractor(reading, originalText).then(distractor => {
            if (!distractor) {
                container.textContent = originalText;
                return;
            }

            const options = [originalText, distractor];
            populateSelectOptions(select, options);
        });

        handleMultipleChoiceSelection(select, container, originalText, cohortIndex);
        container.appendChild(select);
        return container;
    };

    window.EnhanceFuncs["verb-aspect-pairs-cloze"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const reading = getVerbReading(cohort);
        if (!reading) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const wrapper = document.createElement('span');
        wrapper.className = `ʁ ʁ${cohortIndex} ʁ-aspect-cloze-wrapper`;

        const container = document.createElement('span');
        container.className = `ʁ-aspect-cloze`;

        // Create hint (Impf/Perf)
        const lemma = reading.l;
        let pairHint = "";
        if (impfToPerfMap && impfToPerfMap[lemma]) {
            pairHint = `(${lemma}/${impfToPerfMap[lemma]})`;
        } else if (perfToImpfMap && perfToImpfMap[lemma]) {
            pairHint = `(${perfToImpfMap[lemma]}/${lemma})`;
        }

        const prompt = document.createElement('span');
        prompt.className = 'ʁ-cloze-prompt';
        prompt.textContent = pairHint;
        prompt.style.fontSize = '0.8em';
        prompt.style.color = '#666';
        prompt.style.marginRight = '0.5ch';

        const input = createClozeInput(originalText);

        container.appendChild(input);
        wrapper.appendChild(prompt);
        wrapper.appendChild(container);
        return wrapper;
    };

    async function generateAspectDistractor(reading, originalText) {
        const lemma = reading.l;
        const tags = reading.ts;
        const isImpf = tags.includes('Impf');

        let targetLemma;
        let newTags = [...tags];

        if (isImpf) {
            targetLemma = impfToPerfMap[lemma];
            if (!targetLemma) return null;

            // Swap Impf -> Perf
            const idx = newTags.indexOf('Impf');
            if (idx !== -1) newTags[idx] = 'Perf';

            // Prs -> Fut
            const prsIdx = newTags.indexOf('Prs');
            if (prsIdx !== -1) newTags[prsIdx] = 'Fut';

        } else {
            targetLemma = perfToImpfMap[lemma];
            if (!targetLemma) return null;

            // Swap Perf -> Impf
            const idx = newTags.indexOf('Perf');
            if (idx !== -1) newTags[idx] = 'Impf';

            // Fut -> Prs
            const futIdx = newTags.indexOf('Fut');
            if (futIdx !== -1) newTags[futIdx] = 'Prs';
        }

        // Generate form
        const input = `${targetLemma}+${newTags.join('+')}`;
        try {
            const forms = await window.generateForms(input);
            if (forms && forms.length > 0) {
                let distractor = forms[0];
                // Match capitalization
                const capType = window.RLTKUtils.detectCapitalization(originalText);
                distractor = window.RLTKUtils.matchCapitalization(distractor, capType);
                return distractor;
            }
        } catch (e) {
            console.error("Error generating aspect distractor", e);
        }
        return null;
    }

    // Enhancement functions for verb-tense
    window.EnhanceFuncs["verb-tense-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-tense`;
        span.style.backgroundColor = 'rgba(0, 0, 128, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verb-tense-click"] = function(originalText, cohort, cohortIndex, isCorrect) {
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

    // Helper functions for MC activities
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
                    originalText, cohortIndex, 'ʁ-aspect-correct'
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
                const wrapper = this.closest('.ʁ-aspect-cloze-wrapper');
                const cohortIndex = wrapper.className.match(/ʁ(\d+)/)[1];

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-aspect-correct'
                    );
                    correctSpan.dataset.originalText = correctAnswer;
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

})();
