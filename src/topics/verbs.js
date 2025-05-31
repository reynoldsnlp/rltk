(function() {
    'use strict';

    // Verb filter function
    window.FilterFuncs.verbs = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('V')) return true;
        }
    };

    // Verb enhancement functions
    window.EnhanceFuncs["verbs-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb`;
        span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verbs-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Verb: ${originalText}`));
        return span;
    };
})();
