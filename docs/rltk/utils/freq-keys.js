/**
 * Shared helpers for keying the reference frequency list
 * (resources/models/Sharoff_frqc_lempos_freq.json).
 *
 * The reference list is POS-aware: keys are `lemma+CANONICAL_POS` (e.g. "стать+V"),
 * built by scripts/build_freq_dict.py. Lookups must normalise the lemma and map the
 * analyzer's POS tag to the same canonical POS the build script used, so this logic
 * lives in one place and is loaded by both sidepanel.html and offscreen.html.
 *
 * Exposed as the global `window.RLTK_FREQ`.
 */
(function (global) {
    'use strict';

    // gt-desc analyzer POS tag (first tag of a reading) -> canonical POS.
    // Inventory: giellalt/lang-rus src/fst/morphology/root.lexc.
    // Must stay in sync with FRQC_POS in scripts/build_freq_dict.py.
    const POS_TO_CANONICAL = {
        N: 'N', Prop: 'N', Abbr: 'N',
        V: 'V',
        A: 'A', Det: 'A',
        Adv: 'Adv',
        Pron: 'Pron',
        Num: 'Num',
        Pr: 'Pr', Po: 'Pr',
        CC: 'Conj', CS: 'Conj',
        Pcle: 'Pcle', Paren: 'Pcle',
        Interj: 'Intj'
    };

    // Friendly label for the POS column (canonical POS -> display string).
    const CANONICAL_LABEL = {
        N: 'noun', V: 'verb', A: 'adjective', Adv: 'adverb', Pron: 'pronoun',
        Num: 'numeral', Pr: 'preposition', Conj: 'conjunction',
        Pcle: 'particle', Intj: 'interjection'
    };

    // Homograph markers the analyzer appends to lemmas: ASCII digits and superscript
    // digits (e.g. находиться², повод¹, среда², что¹). The Python build script strips
    // these via str.isdigit() (which is true for superscripts), so we must match.
    const HOMOGRAPH_MARKS = /[0-9²³¹⁰⁴-⁹]/g;

    /**
     * Normalise a lemma to match the build script: lowercase, fold ё->е, strip
     * stress/combining marks and homograph digits.
     */
    function normalizeLemma(lemma) {
        return String(lemma || '')
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/[̀-ͯ]/g, '')
            .replace(HOMOGRAPH_MARKS, '');
    }

    /** Map an analyzer POS tag (a reading's first tag) to a canonical POS, or null. */
    function canonicalPos(posTag) {
        return POS_TO_CANONICAL[posTag] || null;
    }

    /**
     * Build the reference-dict key for a (lemma, analyzer POS tag) pair, or null when
     * the lemma is empty or the POS tag is unknown.
     */
    function freqKey(lemma, posTag) {
        const l = normalizeLemma(lemma);
        const p = canonicalPos(posTag);
        return l && p ? l + '+' + p : null;
    }

    /** Friendly display label for a canonical POS (falls back to the canonical code). */
    function posLabel(canonical) {
        return CANONICAL_LABEL[canonical] || canonical || '';
    }

    /**
     * Classify a surface token's capitalization: 'lower', 'title' (first letter upper,
     * rest lower), 'upper' (all upper), or 'mixed'. Used to decide how to display a lemma
     * when every occurrence of it shares one shape.
     */
    function capitalizationShape(surface) {
        const s = String(surface || '');
        if (!s) return 'lower';
        const lower = s.toLowerCase();
        const upper = s.toUpperCase();
        if (s === lower) return 'lower';
        if (s === upper) return 'upper';
        if (s[0] === s[0].toUpperCase() && s.slice(1) === s.slice(1).toLowerCase()) {
            return 'title';
        }
        return 'mixed';
    }

    /** Render a (normalised, lowercase) lemma in a capitalization shape. */
    function applyCapitalization(lemma, shape) {
        const l = String(lemma || '');
        if (shape === 'upper') return l.toUpperCase();
        if (shape === 'title') return l.charAt(0).toUpperCase() + l.slice(1);
        return l;
    }

    global.RLTK_FREQ = {
        normalizeLemma, canonicalPos, freqKey, posLabel,
        capitalizationShape, applyCapitalization
    };
})(typeof self !== 'undefined' ? self : this);
