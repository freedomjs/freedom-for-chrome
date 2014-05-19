/**
 * Gruntfile for freedom-for-chrome.js
 *
 * Here are the common tasks used
 * 
 **/

var FILES = {},
    freedomPaths = require('freedom/Gruntfile.js').FILES;
    prefix = 'node_modules/freedom/';

for (var key in freedomPaths) {
  FILES[key] = freedomPaths[key].map(function(str) {
    if (str[0] === '!') {
      return '!' + prefix + str.substr(1);
    } else {
      return prefix + str;
    }
  });
}
FILES.srcPlatform = [
  'node_modules/freedom/providers/core/core.unprivileged.js', 
  'node_modules/freedom/providers/core/echo.unprivileged.js', 
  'node_modules/freedom/providers/core/peerconnection.unprivileged.js',
  'node_modules/freedom/providers/core/websocket.unprivileged.js',
  'node_modules/freedom/providers/core/view.unprivileged.js',
  'providers/*.js'
];
FILES.specPlatformUnit = ['spec/*.unit.spec.js'];

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
      phantom: { browsers: ['PhantomJS'], singleRun: true, autoWatch: false }
    },
    connect: {default: {options: {
      port: 8000,
      keepalive: false,
      base: ['./node_modules/freedom/','./'],
      //debug: true
    }}},
    jshint: {
      providers: ['providers/*.js'],
      options: {
        '-W069': true
      }
    },
    uglify: {
      freedom: {
        options: {
          sourceMap: true,
          sourceMapName: 'freedom.map',
          sourceMapIncludeSources: true,
          mangle: false,
          beautify: true,
          preserveComments: function(node, comment) {
            return comment.value.indexOf('jslint') !== 0;
          },
          banner: require('fs').readFileSync(prefix + 'src/util/preamble.js', 'utf8'),
          footer: require('fs').readFileSync(prefix + 'src/util/postamble.js', 'utf8')
        },
        files: {
          'freedom-for-chrome.js': FILES.lib
              .concat(FILES.srcCore)
              .concat(FILES.srcPlatform)
        }
      }
    },
    integration: {
      providers: {
        options: {
          templateId: 'khhlpmfebmkkibipnllkeanfadmigbnj',
          spec: 'spec/*.integration.spec.js',
          helper: 'providers/*.js',
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

  grunt.registerTask('default', ['build', 'karma:phantom']);
};
module.exports.FILES = FILES;
