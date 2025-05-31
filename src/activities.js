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
            case 'color':
            case 'cloze':
            case 'multiple-choice':
            case 'mc':
            default:
                return new BaseActivity(selections);
        }
    }
}

// Make classes available globally
window.BaseActivity = BaseActivity;
window.ClickActivity = ClickActivity;
window.ActivityFactory = ActivityFactory;
