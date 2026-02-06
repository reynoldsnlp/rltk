const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Verbs', [
  'verb-do', 'verb-done', 'verb-go', 'verb-drive', 'verb-want',
  'verb-give', 'verb-eat', 'verb-doing-refl', 'verb-participle-pstpss',
  'verb-participle-pstpss-gen', 'verb-participle-short'
], {
  allowMissingIds: ['verb-eat', 'verb-doing-refl'],
  warmupId: 'verb-do'
});
