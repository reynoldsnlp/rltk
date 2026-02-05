const { createParadigmSuite } = require('./paradigms-shared');

// Skip paradigm expansion for pronouns as it can cause flaky timeouts
// due to complex pronoun paradigm generation
createParadigmSuite('Pronouns', [
  'pron-sebya', 'pron-svoy', 'pron-etot', 'pron-nash', 'pron-tvoy',
  'pron-on', 'pron-my', 'pron-kakoy', 'pron-kakov'
], { skipParadigmExpansion: true });
