# VIEW-Addon

## Welcome

**VIEW** is an
ICALL system designed to provide supplementary language learning activities using
authentic texts selected by the learner. VIEW is a multilingual extension of
<a href="http://purl.org/icall/werti">Working with English Real Texts (WERTi)</a>,
which has been under development since 2006.

## About VIEW

VIEW is an intelligent computer-assisted language learning (ICALL)
system designed to provide supplementary language learning
activity resources to language learners. It can be viewed as an intelligent
automatic workbook, providing an unlimited
number of activities designed to foster awareness of English grammatical
forms and functions. Because it is a web-based system, it can be used anywhere
there is a computer with internet access.

The VIEW activities are automatically derived from authentic
texts, obtained from any web page of interest. The task of retrieving
texts appropriate for learners is handled by a separate
<a href="http://purl.org/icall/flair">Form-Focused Linguistically Aware Information Retrieval</a> (FLAIR) project.


VIEW uses state-of-the-art Natural Language Processing (NLP)
technology to generate exercises, identifying
targeted lexical and phrasal material through a combination
of tokenization, lemmatization, morphological analysis, part-of-speech tagging,
chunking, and parsing.

The activity types VIEW provides follow a pedagogically motivated
progression from receptive presentation, to productive
presentation, to controlled practice. Specifically, activities
include the coloring of targeted forms,
having the learner find and click on targeted forms, and finally,
controlled practice activities such as multiple choice, fill-in-the-blank,
or editing tasks.  VIEW provides these activity progressions for a
variety of grammar topics.

## VIEW History

VIEW is a multilingual extension of the <a href="http://purl.org/icall/werti">WERTi
system</a> (Working with English Real Texts), which has been under development since 2006.

The <a href="http://purl.org/icall/werti-v1">original WERTi system</a> was designed by
<a href="http://www.sfs.uni-tuebingen.de/~dm/">Detmar Meurers</a>,
<a href="http://www.ling.ohio-state.edu/~vmetcalf/">Vanessa Metcalf</a>,
<a href="http://people.cohums.ohio-state.edu/amaral1/">Luiz Amaral</a>,
Chris Kovach, and <a href="http://www.myspace.com/coryshain">Cory Shain</a>
at Ohio State University.  Work on WERTi continued at the
<a href="http://www.sfs.uni-tuebingen.de">University of T&uuml;bingen</a>
after Detmar moved there in 2008.  The original Python-based code was ported
to Java and the UIMA framework by <a href="http://github.com/adimit">Aleksandar Dimitrov</a>
and developed further by <a href="http://www.drni.de/niels/">Niels Ott</a>
and <a href="http://www.sfs.uni-tuebingen.de/~rziai/">Ramon Ziai</a>.  A demo of the
<a href="http://purl.org/icall/werti-v2">first Java version</a> is available for reference.
In 2010, <a href="http://www.sfs.uni-tuebingen.de/~adriane/">Adriane Boyd</a> developed the
firefox extension, which improves usability and compatibility, in particular for
web pages with dynamically-generated content and special session handling.


From 2014 to 2016 Eduard Schaf in cooperation with Robert Reynolds introduced and developed
new topics and activities for the Russian language.


In 2016 Eduard Schaf migrated the old firefox-extension to
<a href="https://developer.mozilla.org/en-US/Add-ons/WebExtensions">Webextensions</a>. With this change
the VIEW extension can be used in Firefox, Chrome and Opera and is ready for the future direction
of web extensions.


We are continually working on new topics and activities and are grateful for ideas and contributions in this
area from Magdalena Leshtanska, Emma Li, Iliana Simova, Maria Tchalakova, and Tatiana Vodolazova.


## References


- Detmar Meurers, Ramon Ziai, Luiz Amaral, Adriane Boyd, Aleksandar Dimitrov, Vanessa Metcalf, Niels Ott (2010). <a href="http://www.sfs.uni-tuebingen.de/~dm/papers/meurers-ziai-et-al-10.pdf">Enhancing Authentic Web Pages for Language Learners</a>. Proceedings of the 5th Workshop on Innovative Use of NLP for Building Educational Applications, NAACL-HLT 2010, Los Angeles.
- Aleksandar Dimitrov (2008). <a href="http://github.com/adimit/werti/raw/c4dd20f15e9d6be3aa3f0c21a16745b19a4c9448/docs/paper/paper.pdf">Rebuilding WERTi: Providing a Platform for Second Language Acquisition Assistance.</a> Technical report, Seminar f&uuml;r Sprachwissenschaft, Universit&auml;t T&uuml;bingen.
- Niels Ott and Ramon Ziai (2008). <a href="http://www.drni.de/niels/n3files/read-me/werti-gerunds.pdf">ICALL Activities for Gerunds vs. To-infinitives: A Constraint Grammar-based Extension to the New WERTi System.</a> Term paper for the course <i>Using Natural Language Processing to Foster Language Awareness in Second Language Learning</i>, Universit&auml;t T&uuml;bingen, Summer 2008.
- Vanessa Metcalf and Detmar Meurers (2006). <a href="http://www.ling.ohio-state.edu/icall/handouts/eurocall06-metcalf-meurers.pdf">Generating Web-based English Preposition Exercises from Real-World Texts.</a> EUROCALL 2006. Granada, Spain. September 4&ndash;7, 2006.
- Luiz Amaral, Vanessa Metcalf, Detmar Meurers (2006). <a href="http://www.ling.ohio-state.edu/icall/handouts/calico06-amaral-metcalf-meurers.pdf">Language Awareness through Re-use of NLP Technology.</a> Pre-conference Workshop on NLP in  CALL &ndash; Computational and Linguistic Challenges. CALICO 2006. University of Hawaii. May 17, 2006.

# Project Contents

This projects contains the folders `viewWE` and `viewWE-test` and can both be found in the `src` folder. You will need NPM in a reasonably recent version (~6) to compile the sources, run the test suite, and build the addon.

## Sources

The sources are in `/viewWE`, and are compiled with [webpack](https://webpack.github.io/).
You can use ES2015 syntax, as the sources are transpiled with [babel](http://babeljs.io).
To build the sources, use npm:

```
npm install # install all dependencies
npm run build
```

You can now point your browser in debugging mode to `/addon` where the compiled files are located.

If you are developing the addon itself, it's best to use the watch task, which recompiles the sources on every write:

```
npm run watch:build
```

You can also start an automatic watch task on the test suite that will run it on every write, so you can make sure your changes don't break existing code.

```
npm run watch:test
```

Please write tests for all new and changed functionality. See also the section on [Tests].
You can run both the watch and the build tasks in parallel, by starting them from different shells.

To bundle the addon for distribution, use the bundle task:

```
npm run bundle
```

### Installing new packages

Please run `npm shrinkwrap` and check `npm-shrinkwrap.json` into git after
installing new (versions of) packages.

## Trying out the addon

The npm task `start` launches a clean instance of Firefox (if it is
installed on your system) with the addon already loaded. The console output of
the task will contain error messages and warnings from all sources, including
web pages and other Firefox components. You can check the file the warning or
error originates from, to see if it's relevant for VIEW.

Recompilation happens on file change (`watch:build` is executed in the
background) and Firefox reloads the addon, too.

(When you close the Firefox instance, NPM might complain that error happened.
You can ignore that.)

```
npm run start
```

## Tests

The VIEW add-on has two types of tests: unit tests and functional tests.

Unit tests are supposed to test only small units of the code like one function.

The functional tests are testing the actual functionality of the add-on
like whether the add-on button click is working as expected. Usually you
would do this kind of testing manually. The more functional tests you have
the less manual testing is required.

You can run all tests via:

```
  $ npm run test
```

## Unit Tests

The unit tests are based
on [Mocha](http://mochajs.org/), [Sinon](http://sinonjs.org/)
and [Chai](http://chaijs.com/).

They are run using [Karma](https://karma-runner.github.io), which also provides
for code coverage, using [Istanbul](https://istanbul.js.org/).

Test modules are compiled with webpack.

WebExtensions functions are automatically stubbed by the
[sinon-chrome](https://github.com/acvetkov/sinon-chrome) package.

The test files live in the `viewWE-test/test/unit` directory.
To run them once, use

```
npm run test:unit
```

(You will need to have run `npm install` before.)
If you intend on editing the code or tests, it is usually better to use the watch task:

```
npm run watch:test
```

### Coverage

Coverage reports are generated at the end of each test run on a per-file basis.
They are also generated in HTML form in `viewWE-test/coverage`

### Fixtures

We use [karma-fixture](https://github.com/billtrik/karma-fixture)
together with [karma-html2js-preprocessor](https://github.com/karma-runner/karma-html2js-preprocessor)
for html files and [karma-json-fixtures-preprocessor](https://github.com/dmitriiabramov/karma-json-fixtures-preprocessor)
for json files.

JSON fixtures can be loaded like this:

```
it("plays with the json fixture", function(){
  const json = fixture.load("viewWE-test/fixtures/json/fixture.json");
});
```

HTML fixtures:

```
it("plays with the html fixture", function(){
  const html = fixture.load("/viewWE-test/fixtures/ru-nouns-mc-and-cloze.html");
});
```

Fixtures are *not* loaded into the DOM automatically.
*WARNING:* There is a quirk in the fixtures loading process: json fixtures need to have no
initial slash in the path, but HTML fixtures do.

You could also use `require` and a full relative (to the test file itself) path
to load the json or html as a string during compilation.

## Functional Tests

The functional tests in this repository are run via
[Selenium](http://www.seleniumhq.org/) and
[Geckodriver](https://github.com/mozilla/geckodriver).

Selenium is being driven via the node/javascript language, although python may
also work well (the
[Loop](https://github.com/mozilla/loop/blob/master/docs/Developing.md#functional-tests)
project used Python).

[Mocha](https://mochajs.org/) is used as the test framework.

Useful API: [Javascript API for webdriver](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/firefox/index.html)

The functional tests can be run via:

```
  $ npm run test:func
```

### Name and version changes of the add-on

For the tests to run successfully keep the name and version of the add-on in check:

In ./package.json update:

XPI_NAME=dist/view-1.1.0.zip

In ./viewWE-test/test/functional/utils.js update:

By.id("view_mozilla_org-browser-action")

In this example the name is "view" and the version is "1.1.0" which is in
synch with ./viewWE/manifest.json

FYI:

"view_mozilla_org" refers to

```
"applications": {
    "gecko": {
      "id": "view@mozilla.org"
    }
  }
```

in ./viewWE/manifest.json

"browser-action" is the add-on button.

## Linting

[Linting](http://en.wikipedia.org/wiki/Lint_(software)) is important part of
code development that provides static analysis and helps to find bugs in code.
Integrating it with editors makes it more efficient, as problems can be solved
as you write the code, rather than in a cycle later on.

It also helps to developers to adhere to various style guidelines during the
coding stage, rather than only finding out at review time.

It is recommended for any new project to have linting set up from the start.

## ESLint - Javascript Linting

This repository has [ESLint](http://eslint.org) for providing javascript
analysis. It is a highly flexible tool especially as it is pluggable, so more
rules can be added easily.


## How to add new topics

We will show how to extend the add-on with a new topic using Russian Adjectives
as new topic and Russian Nouns as template.

### Add the new topic option to the toolbar

Go to `viewWE/content_scripts/html/toolbar.html` and make a copy of

`<option id="wertiview-toolbar-topic-nouns" value="nouns">Nouns</option>`

that can be found in the selection menu with the id
`wertiview-toolbar-topic-menu-ru` containing all Russian topics.

Change `nouns` to `adjectives`.

Important: Make sure this name is the same used on server-side.

### Add the new topic json file

Go to `viewWE/topics/` and make a copy of `nouns.json` and rename it to
`adjectives.json` in accordance to the name given in the toolbar option.

Change all occurrences of `noun` to `adjectives` inside the instruction texts.

If your topic contains filters then they need to be changed as well,
otherwise it can be removed. An example for a topic without filters would be
`articles.json`.

A filter is used when a topic can capture multiple subcategories,
like e.g. Feminine Adjectives. Which categories are to be used as filter are
determined by the server-side code. You can see all filters for Adjectives in

`app/src/main/java/werti/uima/enhancer/HFSTRusAdjectiveEnhancer.java`

inside the `filterPattern`, namely `Fem|Msc|Neu|MFN`.

Filters appear as a selection menu in the toolbar, containing each filter as
select option.

Now we are ready to make the changes to the filters:

The first filter is `all` and can be kept as is. It pools all subcategories
together, this means nothing gets filtered.

The next filters correspond to the ones seen in the `filterPattern`.

We will take the `singular` filter as template for the `feminine` filter.
Before you start you should remove the `plural` filter.

First change the filter name `singular` to `feminine`. There are no restrictions
which name you choose, but it should make clear what filter it is.

Change `Sg` in the `id` and `val` to `Fem`, just like in the `filterPattern`.
Change `Singular` to `Feminine` or another name you want to display in the menu.

Repeat the same steps for all other filters in the `filterPattern`.

### Load the new topic json file

In order to use the new topic we just created, it is necessary to load it
into the add-on.

Go to `viewWE/background.js` and make a copy of
`nouns: require('./topics/nouns.json')`.

Change `nouns` into `adjectives` in accordance to the json file name.

### Define the css style for the color activity

The color activity adds a class that consists of `colorize-style-` + topic
to each target. You need to define how those targets should look like.

In our example we will let them look like Russian Noun targets.

Go to `viewWE/content_scripts/css/view.css` and make a copy of the css entry
`.colorize-style-nouns`. Change `nouns` to `adjectives`.
