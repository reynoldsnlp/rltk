(function() {
    'use strict';

    // Preposition filter function
    window.FilterFuncs.prepositions = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Pr')) return true;
        }
    };

    // Preposition enhancement functions
    window.EnhanceFuncs["prepositions-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-preposition`;
        span.style.backgroundColor = 'rgba(255, 192, 203, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["prepositions-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-preposition-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Preposition: ${originalText}`));
        return span;
    };
})();
