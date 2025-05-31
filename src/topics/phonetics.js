(function() {
    'use strict';

    // Phonetics filter function
    window.FilterFuncs.phonetics = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    // Word stress filter function
    window.FilterFuncs["word-stress"] = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    // Phonetics enhancement functions
    window.EnhanceFuncs["phonetics-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic`;
        span.textContent = originalText;
        span.style.fontFamily = 'monospace';
        return span;
    };

    window.EnhanceFuncs["phonetics-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic-hover`;
        span.textContent = originalText;
        span.title = `Phonetic: [${originalText}]`;
        return span;
    };

    window.EnhanceFuncs["word-stress-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress`;
        span.textContent = originalText;
        span.style.fontWeight = 'bold';
        return span;
    };

    window.EnhanceFuncs["word-stress-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-stress-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Stress: ${originalText}`));
        return span;
    };
})();
