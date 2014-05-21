// Karma configuration
// Generated on Fri May 09 2014 12:32:28 GMT-0700 (PDT)
var FILES = require('./Gruntfile').FILES

function bangFilter(elt) {
  if (elt.length > 0) { //Filter strings that start with '!'
    return elt.charAt(0) !== '!';
  } else { //Filter empty strings
    return false;
  }
}

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: FILES.srcCore.concat(
      FILES.srcPlatform,
      FILES.srcJasmineHelper,
      FILES.specCoreUnit,
      FILES.specPlatformUnit,
      FILES.specPlatformIntegration
    ).filter(bangFilter),

    // list of files to exclude
    //exclude: FILES.karmaExclude,
    exclude: FILES.karmaExclude.concat(FILES.specPlatformIntegration),
    
    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    
    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots', 'progress', 'coverage'],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: FILES.srcCore.concat(FILES.srcPlatform).reduce(function(prev, curr, i, arr) {
      prev[curr] = 'coverage';
      return prev;
    }, {}),
    
    // Coverage report options
    coverageReporter: {
      type: 'lcovonly',
      dir: 'tools/coverage/',
      file: 'lcov.info'
    },

    customLaunchers: {},
  });
};
