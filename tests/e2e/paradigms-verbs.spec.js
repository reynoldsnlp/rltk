// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Verbs', [
  'verb-do', 'verb-done', 'verb-go', 'verb-drive', 'verb-want',
  'verb-give', 'verb-eat', 'verb-doing-refl', 'verb-participle-pstpss',
  'verb-participle-pstpss-gen', 'verb-participle-short'
], {
  allowMissingIds: ['verb-eat', 'verb-doing-refl'],
  timeout: 120000
});
