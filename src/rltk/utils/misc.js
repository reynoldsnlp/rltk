/**
 * Miscellaneous Utilities for RLTK Extension
 *
 * This file provides a collection of helper functions used across different parts of the extension.
 * It includes:
 * 1. DOM manipulation helpers (event propagation, style generation).
 * 2. UI component creators (lemma prompts, success spans).
 * 3. Text processing utilities (capitalization detection and application).
 * 4. Shared feedback mechanisms (visual cues for correct/incorrect answers).
 */

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
        ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick'].forEach(eventType => {
            element.addEventListener(eventType, function(e) {
                e.stopPropagation();
            });
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

    /**
     * Detects the capitalization pattern of a string
     * @param {string} text - The text to analyze
     * @returns {string} 'all-caps', 'title-case', or 'lower-case'
     */
    window.RLTKUtils.detectCapitalization = function(text) {
        if (!text) return 'lower-case';
        if (text === text.toUpperCase() && text !== text.toLowerCase()) return 'all-caps';
        if (text[0] === text[0].toUpperCase() && text.slice(1) === text.slice(1).toLowerCase()) return 'title-case';
        return 'lower-case';
    };

    /**
     * Removes accents from a string
     */
    window.RLTKUtils.removeAccents = function(text) {
        return text ? text.replace(/[\u0300\u0301]/g, "").replace(/ё/g, "е").replace(/Ё/g, "Е") : text;
    };

    /**
     * Return all Reading Tutor spans belonging to one word.
     *
     * A single word can be rendered across several spans when a site wraps each
     * character in its own element. Every fragment of a word shares the
     * ʁ<cohortIndex> class, so this returns the whole group for a given index.
     *
     * @param {number|string} cohortIndex - The cohort index identifying the word.
     * @returns {HTMLElement[]} The word's spans (empty if none found).
     */
    window.RLTKUtils.getReadingTutorWordSpans = function(cohortIndex) {
        if (cohortIndex === null || cohortIndex === undefined) return [];
        return Array.from(document.querySelectorAll(`.ʁ-reading-tutor.ʁ${cohortIndex}`));
    };

    /**
     * Applies a capitalization pattern to a string
     * @param {string} text - The text to modify
     * @param {string} pattern - The pattern to apply ('all-caps', 'title-case', 'lower-case')
     * @returns {string} The modified text
     */
    window.RLTKUtils.matchCapitalization = function(text, pattern) {
        if (!text) return text;
        switch (pattern) {
            case 'all-caps':
                return text.toUpperCase();
            case 'title-case':
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            case 'lower-case':
            default:
                return text.toLowerCase();
        }
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
