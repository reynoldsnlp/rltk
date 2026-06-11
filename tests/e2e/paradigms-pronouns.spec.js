// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Pronouns', [
  'pron-sebya', 'pron-svoy', 'pron-etot', 'pron-nash', 'pron-tvoy',
  'pron-on', 'pron-my', 'pron-kakoy', 'pron-kakov'
]);
