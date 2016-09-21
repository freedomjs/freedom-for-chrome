/**
 * Gruntfile for freedom-for-chrome.js
 *
 * This repository provides chrome (app and extension)
 * specific packaging of the freedom.js library.
 *
 * Here are the common tasks defined:
 * build
 * - Lint source and compile
 * - (Default task)
 * - Unit tests for sanity checking possible without actually launching chrome
 * unit
 * - Build and run jasmine headless unit tests
 * test
 * - Build and run chrome app for integration tests
 **/

var freedomPrefix = require('path').dirname(require.resolve('freedom'));

module.exports = function (grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      freedom: {
        files: {
          'build/freedom-for-chrome.js': ['lib/entry.js']
        }
      },
      jasmine_unit: {
        files: {
          'spec.js': ['spec/*.unit.spec.js']
        }
      },
      jasmine_full: {
        files: {
          'spec.js': ['spec/*.integration.spec.js']
        }
      },
      options: {
        debug: true,
      }
    },
    concat: {
      options: {
        sourceMap: true,
        banner: require('fs').readFileSync(require.resolve('freedom/src/util/header.txt')).toString()
      },
      dist: {
        src: 'build/freedom-for-chrome.js',
        dest: 'freedom-for-chrome.js'
      }
    },
    karma: {
      options: {
        configFile: require.resolve('freedom/karma.conf'),
        //Need to run connect:default to host files
        files: [
          require.resolve('es5-shim'),
          require.resolve('es6-promise'),
          'spec.js',
        ],
        reporters: ['progress', 'story', 'junit', 'coverage', 'saucelabs', 'unicorn'],
      },
      phantom: {
        browsers: ['PhantomJS'],
        singleRun: true,
        autoWatch: false,
        options: {
          basePath: __dirname
        }
      },
      cordova: {
        browsers: ['Cordova'],
        singleRun: true,
        autoWatch: false,
        cordovaSettings: {
          platforms: ['android'],//, 'ios'],
          plugins: [
            'org.chromium.common',
            'org.chromium.socket',
            'org.chromium.storage',
            'org.apache.cordova.console'
            //'org.chromium.polyfill.xhr_features',
          ]
        }
      }
    },
    // used for karma unit tests.
    connect: {
      freedom: {
        options: {
          port: 8000,
          keepalive: false,
          base: [freedomPrefix]
        }
      }
    },
    jshint: {
      providers: ['providers/**/*.js'],
      lib: ['lib/**/*.js'],
      options: {
        '-W069': true
      }
    },
    jasmine_chromeapp: {
      providers: {
        files: [
          {src: 'freedom-for-chrome.js', dest: 'freedom-for-chrome.js'},
          {src: 'providers/**', dest: '/', cwd: freedomPrefix, expand: true},
          {src: 'spec/**', dest: '/', cwd: freedomPrefix, expand: true},
          {src: 'spec.js', dest: 'spec.js'},
        ],
        options: {
          paths: [
            'freedom-for-chrome.js',
            'spec.js'
          ],
          keepRunner: true
        }
      }
    },
    bump: {
      options: {
        files: ['package.json'],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin'
      }
    },
    'npm-publish': {
      options: {
        // list of tasks that are required before publishing
        requires: [],
        // if the workspace is dirty, abort publishing (to avoid publishing local changes)
        abortIfDirty: true,
      }
    },
    prompt: {
      tagMessage: {
        options: {
          questions: [
            {
              config: 'bump.options.tagMessage',
              type: 'input',
              message: 'Enter a git tag message:',
              default: 'v%VERSION%',
            }
          ]
        }
      }
    },
    shell: {
      options: {},
      publishWebsite: {
        command: 'bash tools/publishWebsite.sh'
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-chromeapp');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-shell');


  grunt.registerTask('build', [
    'jshint',
    'browserify:freedom',
    'concat'
  ]);
  grunt.registerTask('unit', [
    'browserify:jasmine_unit',
    'connect',
    'karma:phantom'
  ]);
  grunt.registerTask('test', [
    'build',
    'unit',
    'browserify:jasmine_full',
    'jasmine_chromeapp'
  ]);
  grunt.registerTask('cordova', [
    'build',
    'karma:cordova'
  ]);

  grunt.registerTask('release', function(arg) {
    if (arguments.length === 0) {
      arg = 'patch';
    }
    grunt.task.run([
      'default',
      'prompt:tagMessage',
      'bump:' + arg,
      'npm-publish',
      'shell:publishWebsite'
    ]);
  });

  grunt.registerTask('default', ['build', 'unit']);
};
