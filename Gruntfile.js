var FILES = require('freedom/Gruntfile.js').FILES;

for (var key in FILES) {
  FILES[key] = FILES[key].map(function(str) {
    if (str[0] === '!') {
      return '!node_modules/freedom/' + str.substr(1);
    } else {
      return 'node_modules/freedom/' + str;
    }
  });
}

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      providers: ['providers/*.js'],
      options: {
        '-W069': true
      }
    },
    concat: {
      dist: {
        options: {
          process: function(src) {
            return src.replace(/\/\*jslint/g,'/*');
          }
        },
        src: FILES.preamble
            .concat(FILES.src)
            .concat('providers/*.js')
            .concat(FILES.postamble),
        dest: 'freedom-for-chrome.js'
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

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint:providers',
    'concat'
  ]);
  grunt.registerTask('test', [
    'integration',
    'jasmine:unit'
  ]);
  grunt.registerTask('default', ['build', 'test']);
  grunt.registerTask('unit', ['jasmine:unit']);
};


