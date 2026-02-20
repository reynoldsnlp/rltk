# Invited workshop, AATSEEL 2026 (New Orleans)

## Backstory

- VIEW (Meurers, et al., 2013) and rusVIEW (Reynolds & Schaf, 2016)
  - Automatic exercise generation on webpages
  - English, German, Spanish, and then Russian later
  - Java backend (UIMA framework)
  - Slow
  - Unreliable server connection

## Goals

- Future-proof
  - Use only standard web technologies
    - Hypertext Markup Language (html)
    - Cascading Style Sheets (css)
    - Javascript (js)
    - Web Assembly (wasm)
- Reliable
  - No server APIs; everything in user's browser
    - Therefore must be lightweight
  - No LLMs/AI
  - C++ dependencies compiled to Web Assembly (wasm)
- Easy to maintain
  - No javascript dependendencies (which *will* break someday)
- Fast
  - No LLMs/AI

## Brief demo

- Reading tutor
  - Translations and tables
  - Grammar highlighter
  - Vocabulary
- Reading activities
  - Word stress (mark stress, hover)
  - Noun declension (multiple-choice)
  - Phonetic transcription (Konnor Petersen)
  - Roots (Sam Handley)
- Writing tutor

### What content can RLTK annotate?

- Any webpage that is rendered as text in HTML, i.e. the Document Object Model (DOM)
  - This means almost all websites will work
    - Youtube transcripts
    - News websites
    - Wikipedia
    - Children's online encyclopedias (easier reading level)
    - Business / retail / advertising websites
  - RLTK will NOT work with...
    - Images with text in them
      - Note that Google Docs is rendered as images in the browser, not text (using <canvas> elements)
- Any text file that you can open in a browser (except PDFs)
  - Recommended: save documents as `txt` files

## How it works (overview)

Rule-based approach. ("Don't guess if you know.")

- Morphological analysis
  - Finite-state transducer (FST)
  - All possible readings for each word
- Constraint Grammar (CG)
  - Remove impossible/unlikely readings based on readings of surrounding words
- Do interesting things

## Morphological analysis

My FST is a (mostly) complete implementation of Zaliznjak's 1977 "Grammatical dictionary of Russian" (>110,000 entries).

> па́почка ж 3*a (_уменьш. к_ папка)
> па́почка мо <жо 3*a> (_уменьш. к_ папка)
> засты́ть св нп 15a [//__засты́нуть__] ◑III
> су́мка ж 1*b
> мо́ре ср 2*c
> краси́вый прил 4*b
> бе́лый прил 3*c
> говори́ть нсв 5*a
> сказа́ть св 6*c

- Headword + stress marks — the lemma with accent position (critical in Russian morphology/phonology)
- Part of speech and grammatical categories — e.g., ж (feminine), ср (neuter), нсв (imperfective), св (perfective)
- Inflection class index like 3*a, 15a, etc. indicating the full paradigm type used to generate forms
- Parenthetical notes often are given on derivation (e.g., diminutive) or special use.

Analysis of `5 лет` "5 years".

```
"<5>"
        "5" Num Acc <W:0.0>
        "5" Num Dat <W:0.0>
        "5" Num Gen <W:0.0>
        "5" Num Ins <W:0.0>
        "5" Num Loc <W:0.0>
        "5" Num Nom <W:0.0>
"<лет>"
        "год" N Msc Inan Pl Gen Count <W:0.0>
        "лета" N Neu Inan Pl Gen <W:0.0>
        "лето" N Neu Inan Pl Gen Prb <W:0.0>
        "лёт" N Msc Inan Sg Acc <W:0.0>
        "лёт" N Msc Inan Sg Nom <W:0.0>
```

Transducers are reversible
- лет:год+N+Msc+Inan+Pl+Gen+Count <-> год+N+Msc+Inan+Pl+Gen+Count:лет


## Constraint grammar

The goal of my constraint grammar is to be conservative, only removing readings
that are certainly incompatible. This means leaving ambiguity, whether it is
inherent or not.

A (simplistic) rule to remove the `Nom` and `Acc` readings

```
REMOVE (Acc Nom) IF (-1 ("5"));
```

## Do interesting things

### Morphological paradigm table generation

Generate a table from one reading by...

1. Use existing reading to identify which kind of table to generate.
1. Add pre-existing template of tags to the lemma
1. Distribute resulting wordforms in a table

### Word stress annotation

I can add stress to text by doing the following:

1. Analyze text using unstressed analyzer.
1. Use Constraint grammar to reduce morphosyntactic ambiguity.
1. Generate stressed wordforms from all remaining readings.
1. Choose how to handle any remaining stress ambiguity
   - Morphosyntactic ambiguity does not always lead to stress ambiguity.
   - When it does...
     - random selection from available stressed forms
     - combine the outputs and mark stress on multiple syllables
     - abstain (leave it unstressed)
     - etc.
1. Replace original wordforms with stressed wordforms.

### Conversion to phonetic representation

Once a stressed wordform is available, Russian orthography allows for a fairly
robust derivation of phonetic wordforms (graph2phone or g2p). In 2019, Konnor
Peterson work with me on a humgrant to develop a TWO-Level morphology (twolc)
that compiles into a finite-state transducer that converts stressed Russian
wordforms into the Russian Phonetic Alphabet.

## Ideas for how to use RLTK

### Instructors

#### Lesson preparation

- `Vocabulary`: Identify 8–12 high‑value lemmas in the target text using Vocabulary keyness to build a focused pre‑teaching list.
- `Grammar highlighter`: Verify the density and distribution of a single target feature (e.g., participles) before class.
- `Translations and tables`: Create a short “contrast set” list by exporting paradigms for 2–3 representative words to support noticing.

#### In-class activities

- Guided noticing: students click a curated set of tokens and summarize the form‑meaning mapping aloud.
- Retrieval practice: quick “spot and explain” rounds using Reading tutor tables for target forms.
- Collaborative error analysis: groups predict paradigm slots, then verify with generated tables.
- Task‑based reading: students answer comprehension questions that require attention to marked forms.
- Pair work: one student controls RLTK, the other verbalizes rules and checks.

#### Homework assignments

- Extensive reading with checkpoints: students click 10 unfamiliar tokens and log translations + lemmas.
- Spaced review: students revisit a text and use keyness to choose new vocabulary targets.
- Focused practice: assign one feature (e.g., noun cases) and submit three paradigm screenshots.
- Low‑stakes quiz: students identify stressed syllables after RLTK stress "hover" annotation.

### Learners

- Build a personal vocabulary list by sorting keyness and selecting 10–15 lemmas per week.
- Use `Translations and tables` for immediate form‑meaning mapping instead of guessing from context alone.
- Practice metalinguistic awareness: explain why a form is chosen in its sentence.
- Track progress by re‑reading the same text and noting reduced reliance on clicks.
- `Grammar highlighter`: Focus attention on a single structure during extensive reading.
