/**
 * Include everything under test/unit that ends in 'test.js' into the test context.
 */
const testsContext = require.context('./test/unit', true, /.test.js$/);
testsContext.keys().forEach(testsContext);
