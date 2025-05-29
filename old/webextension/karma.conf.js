/**
 * Configuration files for tests
 *
 * The test suite is in /viewWE-test. We include an entrypoint 'karma.entry.js',
 * which takes care of loading all tests in the correct context.
 *
 * Webpack is used to create the test bundle.
 */

const path = require('path');

/**
 * We include the standard webpack.config, so we don't have to replicate it here.
 * It needs to be modified slightly.
 */
const webpackConfig = require('./webpack.config.js');

/**
 * Use inline source maps for karma
 */
webpackConfig.devtool = 'inline-source-map';

/**
 * Add a post processor for istanbul's coverage instrumenter.
 * This takes care of generating coverage that respects the source maps (i.e.
 * not for the whole bundle at once.) We also exclude node_modules and the test
 * files themselves from the coverage reports.
 */
webpackConfig.module.rules.unshift({
  enforce: 'post',
  test: /\.js$/,
  loader: 'istanbul-instrumenter-loader',
  exclude: /(node_modules|viewWE-test)/
});

module.exports = function(config) {
  config.set({
    /**
     * Include the entrypoint and all fixtures
     */
    files: [
      'viewWE-test/karma.entry.js',
      'viewWE-test/fixtures/*.html',
      'viewWE-test/fixtures/json/*.json'
    ],

    preprocessors: {
      /**
       * Generate source maps for the entry point and dependent files, and
       * compile them with webpack
       */
      'viewWE-test/karma.entry.js': ['webpack', 'sourcemap'],

      /**
       * Run the fixtures through the necessary preprocessors.
       */
      'viewWE-test/fixtures/*.html': ['html2js'],
      'viewWE-test/fixtures/json/*.json': ['json_fixtures']
    },

    /**
     * Generate HTML coverage reports in viewWE-test/coverage,
     * and a text report in the end
     */
    coverageIstanbulReporter: {
      reports: ['html', 'text'],
      fixWebpackSourcePaths: true,
      dir: path.join(__dirname, 'viewWE-test/coverage')
    },

    reporters: ['mocha', 'coverage-istanbul'],

    mochaReporter: {
      /**
       * Mocha will report the full suite on first run, and less next time
       */
      output: 'autowatch',
      showDiff: true
    },

    /**
     * Make json fixtures available with window.__json__
     */
    jsonFixturesPreprocessor: {
      variableName: '__json__'
    },

    webpack: webpackConfig,

    /**
     * The framework plugins allow using the functionality without using 'import'
     */
    frameworks: ['chai', 'mocha', 'sinon', 'fixture', 'sinon-chrome'],

    /**
     * We use ChromiumHeadless for fast testing. The tests can also be run in
     * Firefox or Chromium for debugging.
     */
    browsers: ['Firefox', 'Chromium', 'ChromiumHeadless'],

    webpackMiddleware: {
      /**
       * Tell Webpack to be quiet
       */
      stats: 'errors-only'
    }
  });
};
