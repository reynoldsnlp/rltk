// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Adjectives', [
  'adj-big', 'adj-blue', 'adj-good', 'adj-newer', 'adj-novou'
]);
