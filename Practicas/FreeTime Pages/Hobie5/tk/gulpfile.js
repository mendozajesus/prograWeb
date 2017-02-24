'use strict';

var pkg = require('./package.json'),
    rjs = require('./gulp/requirejs'),
    pjs = require('./gulp/phantomjs'),
    sass = require('./gulp/sass'),
    toc = require('./gulp/toc'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    header = require('gulp-header'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    minify = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    prefixer = require('gulp-autoprefixer'),
    compartment = require('compartment'),
    options = gutil.env,
    banner = "/*! Titon Toolkit v<%= pkg.version %> | <%= pkg.licenses[0].type %> License | <%= pkg.homepage.replace('http://', '') %> */\n";

/**
 * Determine which plugins we should package.
 *
 * The --plugins parameter can be used to filter down plugins
 * The --[no-]normalize parameter will include or exclude normalize.css from the output
 * The --dist parameter will determine which folder to build to: build, or dist
 * The --rtl parameter will append a `-rtl` to the CSS filename
 */

var graph = new compartment();
    graph.loadManifest('./manifest.json');
    graph.addTypes({
        js: '', // Handled by RequireJS
        css: './scss/toolkit/'
    });

var toPackage = [],
    categories = ['layout', 'component'];

if (options.plugins) {
    toPackage = options.plugins.split(',');

} else {
    Object.keys(graph.manifest).forEach(function(key) {
        if (key === 'normalize') {
            return;
        }

        if (categories.indexOf(graph.manifest[key].category) >= 0) {
            toPackage.push(key);
        }
    });
}

// Include normalize first
if (options.normalize || !('normalize' in options)) {
    toPackage.unshift('normalize');
}

// Build the chain and generate all the paths we will need.
graph.buildChain(toPackage, categories);

var jsPaths = graph.getPaths('js'),
    cssPaths = graph.getPaths('css'),
    buildPath = options.dist ? './dist' : './build';

/**
 * Tasks to compile CSS and JavaScript files.
 */

gulp.task('css', function() {
    return gulp.src(cssPaths)

        // Unminified
        .pipe(sass({ style: 'expanded' }))
        .pipe(concat('toolkit.css'))
        .pipe(prefixer('last 3 versions'))
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename(function(path) {
            if (options.rtl) {
                path.basename += '-rtl';
            }
        }))
        .pipe(gulp.dest(buildPath))

        // Minified
        .pipe(minify({ advanced: false }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(buildPath));
});

gulp.task('js', function() {
    return rjs(jsPaths, { version: pkg.version })
        .pipe(jshint())
        .pipe(jshint.reporter('default'))

        // Unminified
        .pipe(header(banner, { pkg: pkg }))
        .pipe(gulp.dest(buildPath))

        // Minified
        .pipe(uglify({
            // `some` includes more than just ! comments
            preserveComments: function(node, comment) {
                return comment.value.match(/^!/);
            }
        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(buildPath));
});

gulp.task('test', function() {
    return gulp.src('./tests/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(pjs({ reporter: 'dot' }));
});

gulp.task('docs', function() {
    return gulp.src('./docs/*')
        .pipe(toc());
});

gulp.task('default', ['js', 'css']);

gulp.task('watch', function() {
    gulp.watch('./js/**/*.js', ['js']);
    gulp.watch('./scss/**/*.scss', ['css']);
});
