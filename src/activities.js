/**
 * Base Activity Class
 * Handles the core logic for language learning activities
 */
class BaseActivity {
    constructor(selections) {
        this.topic = selections.topic;
        this.filter = selections.filter;
        this.activity = selections.activity;
        this.enhanceFunc = this.getEnhanceFunc();
    }

    getEnhanceFunc() {
        const enhanceFuncName = `${this.topic}-${this.activity}`;
        const enhanceFunc = window.EnhanceFuncs[enhanceFuncName];

        if (!enhanceFunc) {
            throw new Error(`Enhancement function ${enhanceFuncName} not found`);
        }

        return enhanceFunc;
    }

    // Default behavior: only highlight tokens that pass both filters
    shouldHighlightToken(cohort) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }

    // Default behavior: correctness is same as highlighting
    isTokenCorrect(cohort) {  //TODO rename to isTokenTargeted?
        return this.shouldHighlightToken(cohort);
    }

    // Create the enhanced span
    createSpan(originalText, cohort, cohortIndex) {
        const isCorrect = this.isTokenCorrect(cohort);
        return this.enhanceFunc(originalText, cohort, cohortIndex, isCorrect);
    }
}

/**
 * Click Activity Class
 * Highlights all word tokens but only marks correct ones based on filters
 */
class ClickActivity extends BaseActivity {
    // Click activities highlight ALL word tokens
    shouldHighlightToken(cohort) {
        return cohort.w !== undefined && cohort.rs; // Only word cohorts with readings
    }

    // But correctness is based on the selected filters
    isTokenCorrect(cohort) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }
}

/**
 * Multiple Choice Activity Class
 * Base class for multiple choice activities
 */
class MultipleChoiceActivity extends BaseActivity {
    constructor(selections) {
        super(selections);
        this.distractorGenerator = this.getDistractorGenerator();
    }

    getDistractorGenerator() {
        // Default distractor generator - topics can override this
        return null;
    }

    // Multiple choice activities highlight only the target tokens
    shouldHighlightToken(cohort) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }

    // All highlighted tokens are correct in multiple choice activities
    isTokenCorrect(cohort) {
        return this.shouldHighlightToken(cohort);
    }

    /**
     * Creates a standard multiple choice select element
     */
    createSelectElement(originalText, cohort, cohortIndex) {
        const select = document.createElement('select');
        const width = window.RLTKUtils.getResponsiveWidth(originalText, 1);
        select.style.cssText = window.RLTKUtils.getBaseFormStyles(width);

        // Prevent event propagation
        window.RLTKUtils.addStopPropagationListeners(select);

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '?';
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);

        return select;
    }

    /**
     * Handles the selection event for multiple choice
     */
    handleSelection(select, container, originalText, cohortIndex) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrect = selectedOption.dataset.isCorrect === 'true';

            if (isCorrect) {
                // Correct answer: replace with success span
                const correctSpan = window.RLTKUtils.createSuccessSpan(
                    originalText, cohortIndex, 'ʁ-mc-correct'
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
}

/**
 * Cloze Activity Class
 * Creates fill-in-the-blank exercises where users type the correct form
 */
class ClozeActivity extends BaseActivity {
    // Cloze activities highlight only the target tokens
    shouldHighlightToken(cohort) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }

    // All highlighted tokens are correct in cloze activities
    isTokenCorrect(cohort) {
        return this.shouldHighlightToken(cohort);
    }

    /**
     * Creates a standard cloze input element
     */
    createInputElement(originalText, lemma) {
        const input = document.createElement('input');
        input.type = 'text';
        const width = window.RLTKUtils.getResponsiveWidth(originalText, 1);
        input.style.cssText = window.RLTKUtils.getBaseFormStyles(width);
        input.placeholder = '?';
        input.dataset.correctAnswer = originalText;

        // Prevent event propagation
        window.RLTKUtils.addStopPropagationListeners(input);

        return input;
    }

    /**
     * Adds standard input validation for cloze activities
     */
    addInputValidation(input) {
        input.addEventListener('input', function() {
            const userInput = this.value.trim();
            const correctAnswer = this.dataset.correctAnswer;

            if (userInput === '') {
                // Reset to neutral state
                this.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                return;
            }

            if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                // Correct answer
                this.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
                this.style.borderColor = '#4CAF50';
            } else {
                // Incorrect answer
                this.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                this.style.borderColor = '#f44336';
            }
        });
    }

    /**
     * Handles Enter key confirmation for cloze activities
     */
    addEnterKeyHandler(input, container, cohortIndex) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const userInput = this.value.trim();
                const correctAnswer = this.dataset.correctAnswer;

                if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
                    // Correct answer: replace with success span
                    const correctSpan = window.RLTKUtils.createSuccessSpan(
                        correctAnswer, cohortIndex, 'ʁ-cloze-correct'
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

    /**
     * Adds focus/blur handlers for better UX
     */
    addFocusHandlers(input) {
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
}

/**
 * Activity Factory
 * Creates the appropriate activity instance based on selections
 */
class ActivityFactory {
    static createActivity(selections) {
        // Validate required selections
        if (!selections.topic || !selections.activity) {
            throw new Error('Missing required selections: topic and activity are required');
        }

        switch (selections.activity) {
            case 'click':
                return new ClickActivity(selections);
            case 'cloze':
                return new ClozeActivity(selections);
            case 'mc':
            case 'multiple-choice':
                return new MultipleChoiceActivity(selections);
            case 'color':
            default:
                return new BaseActivity(selections);
        }
    }
}

// Make classes available globally
window.BaseActivity = BaseActivity;
window.ClickActivity = ClickActivity;
window.MultipleChoiceActivity = MultipleChoiceActivity;
window.ClozeActivity = ClozeActivity;
window.ActivityFactory = ActivityFactory;
