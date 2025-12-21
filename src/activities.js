/**
 * Activity Logic for RLTK Extension
 *
 * This file defines the classes that handle the logic for different types of language learning activities.
 * It includes:
 * 1. BaseActivity: Common logic for all activities (filtering, enhancement).
 * 2. ClickActivity: Logic for "click-to-identify" activities.
 * 3. TargetedActivity: Logic for activities that target specific tokens (e.g., Multiple Choice, Cloze).
 * 4. Activity Factory: Creates activity instances based on user selection.
 */

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

    /**
     * Retrieves the specific enhancement function for the selected topic and activity.
     * These functions are defined in the topic-specific files.
     */
    getEnhanceFunc() {
        const enhanceFuncName = `${this.topic}-${this.activity}`;
        const enhanceFunc = window.EnhanceFuncs[enhanceFuncName];

        if (!enhanceFunc) {
            throw new Error(`Enhancement function ${enhanceFuncName} not found`);
        }

        return enhanceFunc;
    }

    /**
     * Prepare the activity by loading necessary resources.
     * Checks for a topic-specific initialization function.
     */
    async prepare() {
        if (window.TopicInitFuncs && window.TopicInitFuncs[this.topic]) {
            await window.TopicInitFuncs[this.topic]();
        }
    }

    /**
     * Determines if a token should be highlighted/processed based on filters.
     * Default behavior: only highlight tokens that pass both topic and sub-filters.
     * @param {Object} cohort - The morphological analysis cohort for the token.
     * @param {number} cohortIndex - The index of the cohort in the text.
     */
    shouldHighlightToken(cohort, cohortIndex) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }

    /**
     * Determines if a token is "correct" according to the activity rules.
     * Default behavior: correctness is same as highlighting criteria.
     */
    isTokenCorrect(cohort, cohortIndex) {
        return this.shouldHighlightToken(cohort, cohortIndex);
    }

    /**
     * Creates the enhanced DOM element (span) for a token.
     * @param {string} originalText - The original text of the token.
     * @param {Object} cohort - The morphological analysis cohort.
     * @param {number} cohortIndex - The index of the cohort.
     */
    createSpan(originalText, cohort, cohortIndex) {
        const isCorrect = this.isTokenCorrect(cohort, cohortIndex);
        const element = this.enhanceFunc(originalText, cohort, cohortIndex, isCorrect);

        // Store original text for restoration
        if (element && element.nodeType === Node.ELEMENT_NODE) {
            element.dataset.originalText = originalText;
        }

        return element;
    }
}

/**
 * Click Activity Class
 * Highlights all word tokens but only marks correct ones based on filters.
 * Used for "Click on all [Grammar Feature]" activities.
 */
class ClickActivity extends BaseActivity {
    // Click activities highlight ALL word tokens to allow user selection
    shouldHighlightToken(cohort) {
        return cohort.w !== undefined && cohort.rs; // Only word cohorts with readings
    }

    // But correctness is based on the selected filters (the target grammar feature)
    isTokenCorrect(cohort) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        return cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);
    }
}

/**
 * Targeted Activity Class
 * Base class for activities that select specific target tokens (like MC and Cloze)
 * Handles stateful token selection to ensure consistency between highlighting and rendering
 */
class TargetedActivity extends BaseActivity {
    constructor(selections) {
        super(selections);
        this.selectedCohorts = new Set();
    }

    /**
     * Determines if a token should be a target for the activity.
     * Uses TokenSelector to space out targets appropriately.
     */
    shouldHighlightToken(cohort, cohortIndex) {
        const topicFilterFunc = window.FilterFuncs[this.topic];
        const subfilterFunc = window.SubFilterFuncs[this.filter];

        const base = cohort.rs &&
               topicFilterFunc && topicFilterFunc(cohort) &&
               subfilterFunc && subfilterFunc(cohort);

        if (!base) {
            return false;
        }

        const selected = window.RLTKUtils.TokenSelector.shouldSelectToken(cohortIndex);
        if (selected) {
            this.selectedCohorts.add(cohortIndex);
        }
        return selected;
    }

    isTokenCorrect(cohort, cohortIndex) {
        return this.selectedCohorts.has(cohortIndex);
    }
}

/**
 * Multiple Choice Activity Class
 * Base class for multiple choice activities
 */
class MultipleChoiceActivity extends TargetedActivity {
    constructor(selections) {
        super(selections);
        this.distractorGenerator = this.getDistractorGenerator();
    }

    getDistractorGenerator() {
        // Default distractor generator - topics can override this
        return null;
    }

    // shouldHighlightToken and isTokenCorrect are handled by TargetedActivity

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
class ClozeActivity extends TargetedActivity {
    // shouldHighlightToken and isTokenCorrect are handled by TargetedActivity

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
            case 'explore':
                return new ClickActivity(selections);
            case 'cloze':
                // Special case: 'word-stress' 'cloze' is actually a 'Hover' activity
                // which should apply to all tokens, not a random selection.
                if (selections.topic === 'word-stress') {
                    return new BaseActivity(selections);
                }
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
