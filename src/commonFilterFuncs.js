(function() {
    'use strict';

    // Initialize FilterFuncs namespace if it doesn't exist
    if (!window.FilterFuncs) {
        window.FilterFuncs = {};
    }

    // Initialize SubFilterFuncs namespace
    if (!window.SubFilterFuncs) {
        window.SubFilterFuncs = {};
    }


    // Common filter function for all words
    window.FilterFuncs.all = function(cohort) {
        return cohort && cohort.w !== undefined;
    };

    // Default subfilter - accept all tokens that pass topic filter
    window.SubFilterFuncs["no-filter"] = function(cohort) {
        return true;
    };

    // Common gender filters
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

    // Legacy filters for backward compatibility // TODO: Remove need for these
    window.SubFilterFuncs.animate = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Anim')) return true;
        }
    };

    window.SubFilterFuncs.inanimate = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Inan')) return true;
        }
    };

    window.SubFilterFuncs.masculine = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Msc')) return true;
        }
    };

    window.SubFilterFuncs.feminine = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Fem')) return true;
        }
    };

    window.SubFilterFuncs.neuter = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Neu')) return true;
        }
    };

    window.SubFilterFuncs.singular = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Sg')) return true;
        }
    };

    window.SubFilterFuncs.plural = function(cohort) {
        for (const reading of cohort.rs) {
            if (reading.ts && reading.ts.includes('Pl')) return true;
        }
    };
})();
