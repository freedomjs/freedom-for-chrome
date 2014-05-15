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
        proxies: {'/': 'http://localhost:8000/'}
      },
      single: {
        browsers: ['Chrome'],
        singleRun: false,
        autoWatch: true
      }
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
    },
    jasmine: {
      unit: {
        src: ['providers/*.js'],
        options: {
          specs: ['spec/*.unit.spec.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-karma');

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint:providers',
    'uglify'
  ]);
  grunt.registerTask('test', [
    'integration',
    'jasmine:unit'
  ]);

  grunt.registerTask('ray', [
    'build',
    'connect:default',
    'karma:single'
  ]);

  grunt.registerTask('unit', ['jasmine:unit']);
  grunt.registerTask('default', ['build', 'unit']);
};
module.exports.FILES = FILES;
