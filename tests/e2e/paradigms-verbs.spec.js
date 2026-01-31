const { createParadigmSuite } = require('./paradigms-shared');

createParadigmSuite('Verbs', [
  'verb-do', 'verb-done', 'verb-go', 'verb-drive', 'verb-want',
  'verb-give', 'verb-eat', 'verb-doing-refl'
], {
  allowMissingIds: ['verb-eat', 'verb-doing-refl'],
});
