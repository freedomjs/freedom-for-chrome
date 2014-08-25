/**
 * Gruntfile for freedom-for-chrome.js
 *
 * Here are the common tasks used
 *
 **/

var FILES = {
  platform: [
    'providers/*.js'
  ],
  platformSpec: [
    'spec/*.unit.spec.js'
  ],
  platformIntegration: [
    'spec/*.integration.spec.js'
  ]
};

var fileInfo = require('freedom'),
  freedomPrefix = require.resolve('freedom').substr(0,
      require.resolve('freedom').lastIndexOf('freedom') + 8);

var addPrefix = function (file) {
  if (file.indexOf('!') !== 0 && file.indexOf('/') !== 0) {
    return freedomPrefix + file;
  }
  return file;
};


var freedomSrc = [].concat(
  fileInfo.FILES.lib,
  fileInfo.FILES.srcCore,
  fileInfo.FILES.srcPlatform
).map(addPrefix);

FILES.karma = fileInfo.unGlob([].concat(
  fileInfo.FILES.srcCore,
  fileInfo.FILES.srcPlatform,
  fileInfo.FILES.srcJasmineHelper,
  fileInfo.FILES.specCoreUnit,
  fileInfo.FILES.specPlatformUnit,
  fileInfo.FILES.srcProviderIntegration,
  fileInfo.FILES.specProviderIntegration
).map(addPrefix).concat(
  FILES.platform,
  FILES.platformSpec
));

FILES.karmaCoverage = [].concat(
  fileInfo.FILES.srcCore,
  fileInfo.FILES.srcPlatform
).map(addPrefix);

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    karma: {
      options: {
        configFile: 'karma.conf.js',
        //Need to run connect:default to host files
        proxies: {'/': 'http://localhost:8000/'}
      },
      single: { singleRun: true, autoWatch: false },
      watch: { singleRun: false, autoWatch: true },
      phantom: {
        exclude: FILES.karma.exclude.concat(
          fileInfo.FILES.specProviderIntegration.map(addPrefix)),
        browsers: ['PhantomJS'],
        singleRun: true,
        autoWatch: false
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
            'org.apache.cordova.console',
            //'org.chromium.polyfill.xhr_features',
          ]
        }
      }
    },
    connect: {
      default: {
        options: {
          port: 8000,
          keepalive: false,
          base: [freedomPrefix, './']
        }
      }
    },
    jshint: {
      providers: [FILES.platform],
      options: {
        '-W069': true
      }
    },
    uglify: {
      freedom: {
        options: {
          sourceMap: true,
          // sourceMapName must be the same as that defined in the final comment
          // of the `freedom/src/util/postamble.js`
          sourceMapName: 'freedom.map',
          sourceMapIncludeSources: true,
          mangle: false,
          // compress: false, wrap: false, // uncomment to get a clean out file.
          beautify: true,
          preserveComments: function(node, comment) {
            return comment.value.indexOf('jslint') !== 0;
          },
          banner: require('fs').readFileSync(freedomPrefix + 'src/util/preamble.js', 'utf8'),
          footer: require('fs').readFileSync(freedomPrefix + 'src/util/postamble.js', 'utf8')
        },
        files: {
          'freedom-for-chrome.js': freedomSrc.concat(FILES.platform)
        }
      }
    },
    integration: {
      providers: {
        options: {
          templateId: 'khhlpmfebmkkibipnllkeanfadmigbnj',
          spec: FILES.platformIntegration,
          helper: FILES.platform,
          keepBrowser: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-karma');

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint:providers',
    'uglify',
    'connect:default'
  ]);
  grunt.registerTask('test', [
    'build',
    'karma:single',
    'integration'
  ]);
  grunt.registerTask('debug', [
    'build',
    'karma:watch'
  ]);
  grunt.registerTask('cordova', [
    'build',
    'karma:cordova'
  ]);

  grunt.registerTask('default', ['build', 'karma:phantom']);
};

module.exports.FILES = FILES;
