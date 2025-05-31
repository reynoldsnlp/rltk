(function() {
    'use strict';

    // Adjective filter function
    window.FilterFuncs.adjectives = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts
                && reading.ts.includes('A')) return true;
        }
    };

    // Adjective enhancement functions
    window.EnhanceFuncs["adjectives-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-adjective`;
        span.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["adjectives-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        const isAdjective = window.FilterFuncs.adjectives(cohort);

        span.className = `ʁ ʁ${cohortIndex} ${isAdjective ? 'ʁ-click-green' : 'ʁ-click-red'}`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';

        span.addEventListener('click', function() {
            this.classList.toggle('clicked');
        });

        return span;
    };
})();
