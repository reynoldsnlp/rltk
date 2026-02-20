# Russian Language ToolKit (RLTK): A browser extension for grammar analysis and interactive reading activities

```
https://github.com/reynoldsnlp/rltk

Rob Reynolds
Associate Research Professor, Brigham Young University
robert_reynolds@byu.edu; @reynoldsnlp

Invited workshop, AATSEEL 2026 (New Orleans)
```

## Backstory

- VIEW (Meurers, et al., 2013) and rusVIEW (Reynolds & Schaf, 2016)
  - Automatic exercise generation on webpages
  - English, German, Spanish, and later, Russian
  - Java backend server (UIMA framework)
    - send text to server; server sends back grammar analysis
    - Slow
    - Unreliable connection 😢

## Goals for re-write

- Fast
  - No LLMs/AI
- Future-proof
  - Use only standard web technologies (HTML/CSS/javascript/Web Assembly)
  - No javascript dependencies
- Reliable
  - No server; everything runs in user's browser
  - Compile C++ dependencies to Web Assembly (!!!)

## Brief demo

- Reading tutor
  - Translations and tables
  - Grammar highlighter
  - Vocabulary
- Reading activities (still in BETA!)
  - Word stress (mark stress, hover)
  - Noun declension (multiple-choice)
  - Phonetic transcription (by Konnor Petersen)
  - Roots (by Sam Handley)
- Writing tutor

### What content can RLTK annotate?

- Almost all websites
    - LMS (Canvas, Brightspace, Blackboard, Moodle, Sakai, etc.)
    - Youtube transcripts
    - News websites
    - Wikipedia
    - Children's online encyclopedias (easier reading level)
    - Online books (e.g., mezhdunami.org, lib.ru, etc.)
    - Business / retail / advertising websites
- Any text file that you can open in a browser
  - Recommended: save documents as `txt` files, then right-click `Open with > Chrome` (or whichever browser RLTK is installed on)

### What content can RLTK NOT annotate?

- RLTK will NOT annotate...
  - Images with text in them
  - Websites that render text as images
    - Google Docs
    - Maps
    - Figma
    - Video games
  - PDFs
    - ...but you can convert them to plain text files (`.txt`)!
      - (e.g., using Adobe Acrobat, Google Docs, or command-line tools like `pdftotext`)

## How to install

- Open your favorite Chromium-based desktop browser (e.g., Chrome, Edge, Brave, Chromium, etc.)
  - Does not yet work in Safari, Firefox, or mobile browsers (but maybe in the future)

- Go to the Chrome Web Store and search for "RLTK".

![QR code for RLTK installation page in Chrome Web Store](./qr-rltk-chrome-web-store.png)

## Ideas for how to use RLTK

### Instructors

#### Lesson preparation

- `Vocabulary`: Identify 8–12 high‑value lemmas in the target text using Vocabulary keyness to build a focused pre‑teaching list.
- `Grammar highlighter`: Verify the density and distribution of a single target feature (e.g., participles) before class.
- `Translations and tables`: Copy-paste stressed paradigms to your own materials.
- Other ideas?

#### In-class activities

- Grammar-Translation Method: Read, translate, identify grammatical form/use. Focus on form/structure.
  - Does NOT have to be teacher-centered!
- Discreet grammar highlighting/noticing: have Reading Tutor ready on projector to help correct grammar misunderstandings as students read and discuss a text together.
  - No need to stop and discuss grammar; just click and clarify as needed.
  - Projector can show text, or just a list of key vocabulary.
- Guided noticing: students click a curated set of words and summarize the form‑meaning mapping aloud.
- Group paradigm work: groups/individuals write paradigm tables, then verify with Reading Tutor.
- Other ideas?

#### Homework assignments

- Vocabulary identification: students use `Expected frequency` and `Keyness` to choose new vocabulary to learn.
- Low‑stakes quiz: students identify and submit their own mistakes while using Reading Activities (e.g., stressed syllables after RLTK stress "hover" annotation)
- Other ideas?

### Learners

- Use `Translations and tables` to aid reading texts.
- Build a personal vocabulary list by sorting keyness and selecting 10–15 lemmas per week.
- `Grammar highlighter`: Focus attention on a single structure during extensive reading.

## Future directions

- Repair/polish some Reading Activities
- Automatic readability assessment (CEFR levels)
- More activity topics (e.g., verbs of motion, vocabulary quiz, prefixes, suffixes, etc.)
- Export vocabulary lists and tables for use in other applications (e.g., Anki, Quizlet, etc.)
- Add stress annotation to Reading Tutor (currently only available in the Word Stress activity)
- Track errors during Reading Activities and provide summaries to learners.
- UI/UX improvements
  - More fun and engaging design?
  - Adjustable font size (currently quite small)
- You tell me!

### Directions I am NOT pursuing

- User accounts, data collection, and personalized learning
  - privacy
  - Deployment complexity (server/database) leads to app failure
- Integrating LLMs/AI
  - avoid the complexity and cost of integrating LLMs/AI
  - avoid potential for unreliable performance and inappropriate content.
  - I may be persuaded once powerful LLMs can be run locally, but currently they are MUCH too large for most personal computers.

# Technical details

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

- па́почка ж 3*a (_уменьш. к_ папка)
- па́почка мо <жо 3*a> (_уменьш. к_ папка)
- засты́ть св нп 15a [//__засты́нуть__] ◑III
- су́мка ж 1*b
- мо́ре ср 2*c
- краси́вый прил 4*b
- бе́лый прил 3*c
- говори́ть нсв 5*a
- сказа́ть св 6*c

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
