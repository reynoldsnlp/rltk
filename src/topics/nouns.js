(function() {
    'use strict';

    // Noun filter function
    window.FilterFuncs.nouns = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts
                && reading.ts.includes('N')) return true;
        }
    };

    // Noun enhancement functions
    window.EnhanceFuncs["nouns-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-noun`;
        span.textContent = originalText;
        const nounReadings = cohort.rs.filter(reading => reading.ts && reading.ts.includes('N'));
        span.setAttribute('data-readings', JSON.stringify(nounReadings));
        return span;
    };

    window.EnhanceFuncs["nouns-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-noun-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Noun: ${originalText}`));
        return span;
    };
})();
