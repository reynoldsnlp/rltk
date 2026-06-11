// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Proper Nouns', [
  'prop-ivan', 'prop-moscow', 'prop-russia'
]);
