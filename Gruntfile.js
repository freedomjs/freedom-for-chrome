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
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      freedom: {
        files: {
          'freedom-for-chrome.js': ['lib/entry.js']
        },
        options: {
          postBundleCB: function (err, src, next) {
            next(err, require('fs').readFileSync(
              require.resolve('freedom/src/util/header.txt')
            ) + src);
          }
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
        transform: [['folderify', {global: true}]]
      }
    },
    karma: {
      options: {
        configFile: require.resolve('freedom/karma.conf')
        //Need to run connect:default to host files
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
      providers: ['providers/*.js'],
      lib: ['lib/*.js'],
      options: {
        '-W069': true
      }
    },
    integration: {
      providers: {
        options: {
          templateId: 'khhlpmfebmkkibipnllkeanfadmigbnj',
          spec: ['spec.js'],
          helper: [
            {path: 'freedom-for-chrome.js', include: false},
            {path: freedomPrefix + '/providers', name: 'providers', include: false},
            {path: freedomPrefix + '/spec', name: 'spec', include: false}
          ],
          keepBrowser: false
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-karma');

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint',
    'browserify:freedom'
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
    'integration'
  ]);
  grunt.registerTask('cordova', [
    'build',
    'karma:cordova'
  ]);

  grunt.registerTask('default', ['build', 'unit']);
};
