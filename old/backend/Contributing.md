# Contributing

The following is meant as a short introduction to working with
[git](https://git-scm.com/) and [gitlab](https://gitlab.com). It is by no means
comprehensive. Please also refer to the linked documentation.

## Git Workflow

A workflow loosely based on [Github Flow](https://guides.github.com/introduction/flow/)
or [Gitlab Flow](https://docs.gitlab.com/ee/workflow/gitlab_flow.html) is fine.
Briefly, to contribute your changes, you need to:

* Add your SSH-Key to Gitlab and checkout the repository
* Work on a topic-branch (not `master`)
* Push to the topic branch and create a Merge Request

### Checkout the Repository

If you don't have an SSH key, please read up on how to create one in the
[Gitlab documentation](https://docs.gitlab.com/ce/ssh/README.html). Please
make sure to also add it to your account in order to be able to push.

You can then check out the repository:

```
$ git clone ssh://git@git.aleks.bg:10032/view/view.git
```

If you want to just clone the repository, without contributing, you can use the
HTTPS path, but you won't be able to `git push`.

```
$ git clone https://git.aleks.bg/view/view.git
```

### Work on a Topic Branch

#### With Issues

The best way to create a topic branch is to
[create an issue](https://git.aleks.bg/view/view/issues/new) and click on
"new Branch" in the issue view. You can also work an
[existing issue](https://git.aleks.bg/view/view/issues).
This will create a new topic branch, with its name containing the issue number
and the issue title, like `71-tests-for-js` for #71.

You can then check this branch out locally:

```
# Update your local repository
$ git fetch
From ssh://git@git.aleks.bg:10032/view/view
 * [new branch]      71-tests-for-js -> origin/71-tests-for-js

# Check out the issue branch
$ git checkout 71-tests-for-js
```

#### Without Issues

You can just create a local topic branch, too:

```
$ git checkout -b my-local-topic-branch
# Publish your topic branch so the server knows about it
$ git push -u origin my-local-topic-branch
```

But it's nicer if you use issues to track your progress ;-)

### Push and merge

Before committing, make sure you're on the right branch
```
$ git branch
  4-implement-view-route
  119-arrayindexoutofboundsexception
  108-create-post-route-for-view
* 71-tests-for-js
  master
```

The branch indicated with a `*` is the current one.

You can work on your feature or bugfix now. When you're ready, commit and push:

```
$ git add src/file/you/worked/on
$ git commit
```

Please keep your
[commit messages informative](http://chris.beams.io/posts/git-commit/)!

And push:

```
$ git push
```

Many pepole prefer to use their editors' tools for committing their work.
[Intellij](https://www.jetbrains.com/idea/) has native Git support,
[Vim](http://www.vim.org/) has
[fugitive](https://github.com/tpope/vim-fugitive),
[Eclipse](https://eclipse.org) has [Egit](http://www.eclipse.org/egit/).
Finally, I like to use [Emacs](https://www.gnu.org/software/emacs/)'
[Magit](https://magit.vc/). Feel free to use the tool that suits you best.

#### Merge Requests

You can see your branch in the
[branch list](https://git.aleks.bg/view/view/branches)
which is available under "Branches" from the
[project site](https://git.aleks.bg/view/view).
Then create a
[merge request](https://docs.gitlab.com/ee/gitlab-basics/add-merge-request.html)
for your branch.

# Topics & Activities

In VIEW a *topic* is a grammatical phenomenon you want to create exercises for.
With it comes a set of languages, which each have a *pipeline*, a set of UIMA
annotators. Ultimately, the job of the pipeline is to place `Enhancement`
annotations in UIMA's `JCas`. VIEW takes care of placing these enhancement
annotations in the HTML document.

Each topic can have several activities. An *activity* is the exercise itself,
dependent on the `Enhancement` annotations placed by the topic in the document.
Activities live purely in the front-end, and consist mainly of a JavaScript
file, whose job it is to look for VIEW's enhancement tags and do something
useful with them.

### Creating a new Topic

Topics live in the folder `src/main/resources/topics`. All topics located there
are loaded by VIEW when the application is loaded and then presented in the user
interface.

TODO

### Creating a new Activity

TODO

# Code Guidelines

## Configuration of VIEW

Please note that all runtime configuration of VIEW should be possible
*exclusively* by editing `app/src/main/config/VIEW.properties`. This file will
be copied to the classpath of `VIEW.war` on compile time, and contains all
configuration options, *including* paths to models and external programs, such
as analyzers. In particular, please *do not* hard code the location of analysers
in the `.xml` descriptors under `app/desc`. This makes it very hard to change
them.

### Local overrides

If you want to customize some paths in `VIEW.properties` to your local
environment, please use `app/src/main/config/local.properties`. A
`local.properties.example` exists as a template. This file will *not* be copied
by Maven when creating a `.war` package.

**Note**: There is a [bug](https://issues.apache.org/jira/browse/MWAR-340) in
`maven-war-plugin`, which causes files that are excluded from the `.war` archive
to still be included when using the Maven goal `war:exploded`. Be aware that
your `local.properties` file *will* be copied to `target/VIEW/WEB-INF/classes`
and will therefore be on the classpath when using `war:exploded`.
Intellij IDEA users will apparently *not* experience this bug if they build an
exploded package from within IDEA, but using `mvn` from the command line will
trigger it.

## Supported Languages & Language Codes

Please do not use language codes as `String` within VIEW, but use the
[`werti.Language`](/app/src/main/java/werti/Language.java) `enum` instead.
UIMA does not support setting the language (for example in the CAS) as an enum.
You have to use `String` there. 
Please don't generate or parse these strings except through `werti.Language`.

If you are planning to add a new language, add it to the `Language` enum, and
take care to also implement the serialization methods `toString`, `humanLabel`,
and the deserialization method and `fromIsoCode`.
You may also want to extend `getLocale` if e.g. your language's script is not
Latin.

When implementing `toString` and `fromIsoCode`, you will be (de-)serializing
from and to ISO 639 language codes. Since most NLP tools (and UIMA components)
expect ISO 639-1 language codes, we use these whenever possible.
Some languages do not have ISO 639-1 language codes. Please use ISO 639-2/T
(terminological) codes instead for these languages.

Reference: [List of language codes on Wikipedia](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

## Logging

Please use Apache [`log4j2`](http://logging.apache.org/log4j/2.x/) over `log4j`
`1.x`for logging.
Specifically, please don't import anything from `org.apache.log4j`, and use
`org.apache.logging.log4j`.
The former is the 1.x API, the latter the 2.x API. The 1.x API is
[EOL](https://blogs.apache.org/foundation/entry/apache_logging_services_project_announces)
as of August 2015.
We still have to have bindings for it, because the malt parser binds to it
directly, instead of using SLF4J.
The bindings are in the `log4j-1.2-api` dependency, which routes all logs
through log4j2.

### Logging Configuration

Since all logging happens via `log4j2`, there are just two configuration files
you need to edit:

* `src/main/webapp/WEB-INF/classes/log4j2.xml` — the main logging configuration
* `src/test/resources/log4j2-test.xml` — the logging configuration for testing

Note that if `log4j2` finds both on the classpath, it will prefer to load the
`log4j2-test.xml`.
