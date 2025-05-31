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
