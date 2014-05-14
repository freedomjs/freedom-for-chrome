var FILES = require('freedom/Gruntfile.js').FILES;
var prefix = 'node_modules/freedom/';

for (var key in FILES) {
  FILES[key] = FILES[key].map(function(str) {
    if (str[0] === '!') {
      return '!' + prefix + str.substr(1);
    } else {
      return prefix + str;
    }
  });
}

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    karma: {
      options: {
        configFile: 'karma.conf.js',
      },
      single: {
      }
    },
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
  grunt.registerTask('unit', ['jasmine:unit']);
  grunt.registerTask('default', ['build', 'unit']);
};


