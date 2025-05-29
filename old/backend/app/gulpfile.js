'use strict';

const gulp          = require('gulp');
const autoprefixer  = require('gulp-autoprefixer');
const sass          = require('gulp-sass');
const sourcemaps    = require('gulp-sourcemaps');
const webpackStream = require('webpack-stream');
const webpack       = require('webpack');
const named         = require('vinyl-named');

/* Source and deployment paths */
const destPrefix = './target/VIEW/';
const srcPrefix = './src/main/';

gulp.task('default', [
    'templates',
    'sass',
    'javascript',
    'topics',
    'activity:js',
    'activity:css'
]);

gulp.task('watch', [
    'sass:watch',
    'templates:watch',
    'javascript:watch',
    'topics:watch',
    'activity:js:watch',
    'activity:css:watch'
]);

/**
 * Compile all SASS files.
 * Generates source maps and uses autoprefixer as per requirement from Foundation.
 */
gulp.task('sass', function() {
    return gulp.src([srcPrefix + 'sass/app.scss', srcPrefix + 'sass/authenticator.scss'])
        .pipe(sourcemaps.init())
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(sass({
            'includePaths': './node_modules/foundation-sites/assets'
        }).on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(destPrefix + 'css'));
});

gulp.task('activity:css', function() {
    return gulp.src(srcPrefix + 'sass/activity/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(destPrefix + 'css/activity'));
});

gulp.task('activity:js', function() {
    return gulp.src(srcPrefix + 'javascript/activity/*.js')
        .pipe(webpackStream({
            entry: {
                color: srcPrefix + 'javascript/activity/color.js',
                click: srcPrefix + 'javascript/activity/click.js',
                cloze: srcPrefix + 'javascript/activity/cloze.js',
                multi: srcPrefix + 'javascript/activity/multi.js'
            },
            devtool: 'source-map',
            output: {
                filename: '[name].js'
            }
        }))
        .pipe(gulp.dest(destPrefix + 'js/activity'));
});

/**
 * Copies the templates.
 */
gulp.task('templates', function() {
    gulp.src(srcPrefix + 'html/**/*.html')
        .pipe(gulp.dest(destPrefix + 'html'));
});

/**
 * Compile javascript.
 * Generates source maps.
 */
gulp.task('javascript', function() {
    return gulp.src([srcPrefix + 'javascript/view.js', srcPrefix + 'javascript/authenticator/authenticator.js'])
        .pipe(named())
        .pipe(webpackStream({
            entry: {
                view: srcPrefix + 'javascript/view.js',
                authenticator: srcPrefix + 'javascript/authenticator/authenticator.js',
                /*
                 * The vendor entry is just here because foundation's JS stinks.
                 * See this issue: https://github.com/zurb/foundation-sites/issues/7386
                 * And this SO answer: http://stackoverflow.com/a/34576209/11797
                 */
                vendor: [
                    "!!script!jquery/dist/jquery.min.js",
                    "!!script!foundation-sites/dist/js/foundation.min.js"
                ]
            },
            /*
             * External declaration of jquery, again, because foundation stinks, see above
             */
            externals: {
                jquery: "jQuery"
            },
            devtool: 'source-map',
            output: {
                filename: '[name].js'
            },
            pluins: [
                new webpack.ProvidePlugin({
                    '$': 'jquery',
                    jQuery: 'jquery'
                })
            ]
        }))
        .pipe(gulp.dest(destPrefix + 'js/'));
});

gulp.task('topics', function() {
    gulp.src(srcPrefix + 'resources/topics/**/*.json')
        .pipe(gulp.dest(destPrefix + 'topics/'));
});

gulp.task('templates:watch', function () {
    gulp.watch(srcPrefix + 'html/**/*.html', ['templates']);
});

/**
 * We watch all scss files, as they are included from app.scss
 */
gulp.task('sass:watch', function () {
    gulp.watch(srcPrefix + 'sass/*.scss', ['sass']);
});

gulp.task('javascript:watch', function() {
    gulp.watch([srcPrefix + 'javascript/view.js', srcPrefix + 'javascript/authenticator/*.js'], ['javascript']);
});

gulp.task('activity:js:watch', function() {
    gulp.watch(srcPrefix + 'javascript/activity/*.js', ['activity:js']);
});

gulp.task('activity:css:watch', function() {
    gulp.watch(srcPrefix + 'sass/activity/*scss', ['activity:css']);
});

gulp.task('topics:watch', function() {
    gulp.watch(srcPrefix + 'resources/topics/**/*.json', ['topics']);
});
