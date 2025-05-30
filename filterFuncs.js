(function() {
    'use strict';

    // Topic filter functions - determined by "Topic" field
    window.FilterFuncs = {

        all: function(cohort) {
            return cohort && cohort.w !== undefined;
        },

        adjectives: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts
                    && reading.ts.includes('A')) return true;
            }
        },

        "assistive-reading": function(cohort) {
            return cohort && cohort.w !== undefined;
        },

        gerunds: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts
                    && reading.ts.includes('V')
                    && reading.ts.includes('Adv')) return true;
            }
        },

        nouns: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts
                    && reading.ts.includes('N')) return true;
            }
        },

        participles: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts
                    && !reading.ts.includes('Adv')
                    && reading.ts.includes('V')
                    && (reading.ts.includes('PrsAct')
                        || reading.ts.includes('PrsPss')
                        || reading.ts.includes('PstAct')
                        || reading.ts.includes('PstPss'))) return true;
            }
        },

        phonetics: function(cohort) {
            return cohort && cohort.w !== undefined;
        },

        prepositions: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Pr')) return true;
            }
        },

        "verb-aspect-pairs": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('V')) return true;
            }
        },

        "verb-tense": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('V')) return true;
            }
        },

        verbs: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('V')) return true;
            }
        },

        "word-stress": function(cohort) {
            return cohort && cohort.w !== undefined;
        }
    };

    // Subfilter functions - determined by "Filter" field
    window.SubFilterFuncs = {
        // Default subfilter - accept all tokens that pass topic filter
        "no-filter": function(cohort) {
            return true;
        },

        // Participle filters
        "PrsAct": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('PrsAct')) return true;
            }
        },

        "PrsPss": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('PrsPss')) return true;
            }
        },

        "PstAct": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('PstAct')) return true;
            }
        },

        "PstPss": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('PstPss')) return true;
            }
        },

        // Tense filters
        "Pst": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Pst')) return true;
            }
        },

        "Prs": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Prs')) return true;
            }
        },

        "Fut": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Fut')) return true;
            }
        },

        // Aspect filters
        "Impf": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Impf')) return true;
            }
        },

        "Perf": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Perf')) return true;
            }
        },

        // Number filters
        "Sg": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Sg')) return true;
            }
        },

        "Pl": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Pl')) return true;
            }
        },

        // Gender filters
        "Fem": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Fem')) return true;
            }
        },

        "Msc": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Msc')) return true;
            }
        },

        "Neu": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Neu')) return true;
            }
        },

        "MFN": function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('MFN')) return true;
            }
        },

        // Legacy filters for backward compatibility
        animate: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Anim')) return true;
            }
        },

        inanimate: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Inan')) return true;
            }
        },

        masculine: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Msc')) return true;
            }
        },

        feminine: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Fem')) return true;
            }
        },

        neuter: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Neu')) return true;
            }
        },

        singular: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Sg')) return true;
            }
        },

        plural: function(cohort) {
            for (const reading of cohort.rs) {
                if (reading.ts && reading.ts.includes('Pl')) return true;
            }
        }
    };

})();
