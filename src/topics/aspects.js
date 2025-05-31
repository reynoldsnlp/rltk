(function() {
    'use strict';

    // Verb aspect filters
    window.FilterFuncs["verb-aspect-pairs"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('V')) return true;
        }
    };

    // Aspect subfilters
    window.SubFilterFuncs["Impf"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Impf')) return true;
        }
    };

    window.SubFilterFuncs["Perf"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Perf')) return true;
        }
    };

    // Verb tense filters
    window.FilterFuncs["verb-tense"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('V')) return true;
        }
    };

    // Tense subfilters
    window.SubFilterFuncs["Pst"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Pst')) return true;
        }
    };

    window.SubFilterFuncs["Prs"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Prs')) return true;
        }
    };

    window.SubFilterFuncs["Fut"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Fut')) return true;
        }
    };

    // Enhancement functions
    window.EnhanceFuncs["verb-aspect-pairs-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb-aspect`;
        span.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verb-aspect-pairs-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb-aspect-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Verb aspect: ${originalText}`));
        return span;
    };

    window.EnhanceFuncs["verb-tense-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb-tense`;
        span.style.backgroundColor = 'rgba(255, 0, 255, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["verb-tense-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-verb-tense-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Verb tense: ${originalText}`));
        return span;
    };
})();
