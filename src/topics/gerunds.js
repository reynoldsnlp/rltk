(function() {
    'use strict';

    // Gerund filter function
    window.FilterFuncs.gerunds = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts
                && reading.ts.includes('V')
                && reading.ts.includes('Adv')) return true;
        }
    };

    // Gerund enhancement functions
    window.EnhanceFuncs["gerunds-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-gerund`;
        span.style.backgroundColor = 'rgba(255, 165, 0, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["gerunds-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-gerund-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Gerund: ${originalText}`));
        return span;
    };
})();
