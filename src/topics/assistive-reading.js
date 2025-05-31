(function() {
    'use strict';

    // Assistive reading filter function
    window.FilterFuncs["assistive-reading"] = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    // Assistive reading enhancement function
    window.EnhanceFuncs["assistive-reading-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-assistive`;
        span.textContent = originalText;
        span.style.textDecoration = 'underline';
        return span;
    };
})();
