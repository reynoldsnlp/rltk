(function() {
    'use strict';

    // Span creation functions for different topics and activities
    window.EnhanceFuncs = {
        // Adjectives
        "adjectives-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-adjective`;
            span.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "adjectives-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            if (window.FilterFuncs.adjectives(cohort)) {
                span.className = `ʁ ʁ${cohortIndex} ʁ-click-green`;
            } else {
                span.className = `ʁ ʁ${cohortIndex} ʁ-click-red`;
            }
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            // TODO make event listener that will show change ʁ-click-green to
            // green background and ʁ-click-red to red background when clicked.
            // span.addEventListener('click', () => TODO);
            return span;
        },

        // Assistive reading
        "assistive-reading-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-assistive`;
            span.textContent = originalText;
            span.style.textDecoration = 'underline';
            return span;
        },

        // Gerunds
        "gerunds-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-gerund`;
            span.style.backgroundColor = 'rgba(255, 165, 0, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "gerunds-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-gerund-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Gerund: ${originalText}`));
            return span;
        },

        // Nouns
        "nouns-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-noun`;
            span.textContent = originalText;
            const nounReadings = cohort.rs.filter(reading => reading.ts && reading.ts.includes('N'));
            span.setAttribute('data-readings', JSON.stringify(nounReadings));
            return span;
        },

        "nouns-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-noun-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Noun: ${originalText}`));
            return span;
        },

        // Participles
        "participles-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-participle`;
            span.style.backgroundColor = 'rgba(128, 0, 128, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "participles-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-participle-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Participle: ${originalText}`));
            return span;
        },

        // Phonetics
        "phonetics-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic`;
            span.textContent = originalText;
            span.style.fontFamily = 'monospace';
            return span;
        },

        "phonetics-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-phonetic-hover`;
            span.textContent = originalText;
            span.title = `Phonetic: [${originalText}]`;
            return span;
        },

        // Prepositions
        "prepositions-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-preposition`;
            span.style.backgroundColor = 'rgba(255, 192, 203, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "prepositions-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-preposition-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Preposition: ${originalText}`));
            return span;
        },

        // Verb aspect pairs
        "verb-aspect-pairs-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb-aspect`;
            span.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "verb-aspect-pairs-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb-aspect-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Verb aspect: ${originalText}`));
            return span;
        },

        // Verb tense
        "verb-tense-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb-tense`;
            span.style.backgroundColor = 'rgba(255, 0, 255, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "verb-tense-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb-tense-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Verb tense: ${originalText}`));
            return span;
        },

        // Verbs
        "verbs-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb`;
            span.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            span.textContent = originalText;
            return span;
        },

        "verbs-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-verb-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Verb: ${originalText}`));
            return span;
        },

        // Word stress
        "word-stress-color": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-stress`;
            span.textContent = originalText;
            span.style.fontWeight = 'bold';
            return span;
        },

        "word-stress-click": function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex} ʁ-stress-click`;
            span.textContent = originalText;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => alert(`Stress: ${originalText}`));
            return span;
        },

        // Default span function - basic highlighting
        default: function(originalText, cohort, cohortIndex) {
            const span = document.createElement('span');
            span.className = `ʁ ʁ${cohortIndex}`;
            span.textContent = originalText;
            return span;
        }
    };

})();
