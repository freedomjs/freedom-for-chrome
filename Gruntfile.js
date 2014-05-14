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

// Freedom npm dependency doesn't grab promise sub dependency.
var promise_lib =   [
  'node_modules/es6-promise/dist/promise-*.js',
  '!node_modules/es6-promise/dist/promise-*amd.js',
  '!node_modules/es6-promise/dist/promise-*min.js'
]

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
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
              .concat(promise_lib)
              .concat(FILES.src)
              .concat('providers/*.js')
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

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint:providers',
    'uglify'
  ]);
  grunt.registerTask('test', [
    'integration',
    'jasmine:unit'
  ]);
  grunt.registerTask('unit', ['jasmine:unit']);
  grunt.registerTask('default', ['build', 'unit']);
};


