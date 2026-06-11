// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Nouns', [
  'noun-table', 'noun-book', 'noun-window', 'noun-time', 'noun-way',
  'noun-god-voc', 'noun-floor-loc2'
]);
