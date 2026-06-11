# Russian Language ToolKit ( RLTK / ЯLTK )

Russian Language ToolKit is a web browser extension with a collection of
language-learning tools that use Natural Language Processing technology to
automatically generate dynamic language-learning experiences and exercises.

# Package for publication

In order to publish, run the following command in the root directory:

```console
$ ./build_zip.sh
```

# Testing

The Playwright end-to-end suite lives in `tests/e2e/`. Run it from the repo root
with `npm test`. Before adding or changing tests, read
[tests/e2e/README.md](tests/e2e/README.md) — it documents the suite's
conventions, shared helpers, the canonical "settled" wait signals, and the
flakiness attempt log.
