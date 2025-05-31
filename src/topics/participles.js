(function() {
    'use strict';

    // Participle filter function
    window.FilterFuncs.participles = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts
                && !reading.ts.includes('Adv')
                && reading.ts.includes('V')
                && (reading.ts.includes('PrsAct')
                    || reading.ts.includes('PrsPss')
                    || reading.ts.includes('PstAct')
                    || reading.ts.includes('PstPss'))) return true;
        }
    };

    // Participle subfilters
    window.SubFilterFuncs["PrsAct"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('PrsAct')) return true;
        }
    };

    window.SubFilterFuncs["PrsPss"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('PrsPss')) return true;
        }
    };

    window.SubFilterFuncs["PstAct"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('PstAct')) return true;
        }
    };

    window.SubFilterFuncs["PstPss"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('PstPss')) return true;
        }
    };

    // Participle enhancement functions
    window.EnhanceFuncs["participles-color"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-participle`;
        span.style.backgroundColor = 'rgba(128, 0, 128, 0.3)';
        span.textContent = originalText;
        return span;
    };

    window.EnhanceFuncs["participles-click"] = function(originalText, cohort, cohortIndex) {
        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-participle-click`;
        span.textContent = originalText;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => alert(`Participle: ${originalText}`));
        return span;
    };
})();
