(function() {
    'use strict';

    // Initialize RLTKUtils namespace
    if (!window.RLTKUtils) {
        window.RLTKUtils = {};
    }

    /**
     * Prevents click events from propagating to parent elements
     * Useful for form elements inside clickable containers
     */
    window.RLTKUtils.addStopPropagationListeners = function(element) {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        element.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
    };

    /**
     * Creates a responsive width style for form elements based on text length
     * Uses 'ch' units for font-responsive sizing
     */
    window.RLTKUtils.getResponsiveWidth = function(text, extraChars = 6, minChars = 8) {
        return `${Math.max(text.length + extraChars, minChars)}ch`;
    };

    /**
     * Shared CSS styles for form elements
     */
    window.RLTKUtils.getBaseFormStyles = function(width, extraStyles = '') {
        return `
            background-color: rgba(255, 255, 0, 0.3);
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 2px 4px;
            font-family: inherit;
            font-size: inherit;
            width: ${width};
            ${extraStyles}
        `;
    };

    /**
     * Creates a prompt span for cloze activities showing the lemma
     */
    window.RLTKUtils.createLemmaPrompt = function(lemma) {
        const prompt = document.createElement('span');
        prompt.textContent = `(${lemma}) `;
        prompt.style.cssText = `
            color: #666;
            font-style: italic;
            font-size: 0.9em;
            margin-right: 2px;
        `;
        return prompt;
    };

    /**
     * Creates a success span for completed exercises
     */
    window.RLTKUtils.createSuccessSpan = function(text, cohortIndex, className) {
        const span = document.createElement('span');
        span.textContent = text;
        span.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        span.className = `ʁ ʁ${cohortIndex} ${className}`;
        return span;
    };

    /**
     * Shared visual feedback for incorrect answers
     */
    window.RLTKUtils.showIncorrectFeedback = function(element, resetCallback) {
        element.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            if (resetCallback) resetCallback();
        }, 1000);
    };

})();



(function() {
    'use strict';

    // Initialize EnhanceFuncs namespace if it doesn't exist
    if (!window.EnhanceFuncs) {
        window.EnhanceFuncs = {};
    }

    // Default span function - basic highlighting
    window.EnhanceFuncs.default = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex}`;
        span.textContent = originalText;
        return span;
    };
})();




(function() {
    'use strict';

    // =======================================================================
    // Initialize FilterFuncs and SubFilterFuncs namespaces
    // =======================================================================

    if (!window.FilterFuncs) {
        window.FilterFuncs = {};
    }
    if (!window.SubFilterFuncs) {
        window.SubFilterFuncs = {};
    }

    // =======================================================================
    // Default filters "all"
    // =======================================================================

    window.FilterFuncs.all = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    window.SubFilterFuncs.all = function(cohort) {
        return true;
    };

    // =======================================================================
    // Shared tag filters
    // =======================================================================

    window.SubFilterFuncs["Fem"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Fem')) return true;
        }
    };

    window.SubFilterFuncs["Msc"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Msc')) return true;
        }
    };

    window.SubFilterFuncs["Neu"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Neu')) return true;
        }
    };

    window.SubFilterFuncs["MFN"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('MFN')) return true;
        }
    };

    // Shared number filters
    window.SubFilterFuncs["Sg"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Sg')) return true;
        }
    };

    window.SubFilterFuncs["Pl"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Pl')) return true;
        }
    };

})();
