(function() {
    'use strict';

    // =======================================================================
    // Initialize FilterFuncs and SubFilterFuncs namespaces
    // =======================================================================

    if (!window.FilterFuncs) {
        window.FilterFuncs = {};
    }
    if (!window.SubFilterFuncs) {
        window.SubFilterFuncs = {};
    }

    // =======================================================================
    // Default filters "all"
    // =======================================================================

    window.FilterFuncs.all = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    window.SubFilterFuncs.all = function(cohort) {
        return true;
    };

    // =======================================================================
    // Common tag filters
    // =======================================================================

    window.SubFilterFuncs["Fem"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Fem')) return true;
        }
    };

    window.SubFilterFuncs["Msc"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Msc')) return true;
        }
    };

    window.SubFilterFuncs["Neu"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Neu')) return true;
        }
    };

    window.SubFilterFuncs["MFN"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('MFN')) return true;
        }
    };

    // Common number filters
    window.SubFilterFuncs["Sg"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Sg')) return true;
        }
    };

    window.SubFilterFuncs["Pl"] = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Pl')) return true;
        }
    };

})();
