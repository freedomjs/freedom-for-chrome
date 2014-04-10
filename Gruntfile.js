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
        dest: 'freedom.js'
      }
    },
    integration: {
      chrome: {
        options: {
          templateId: 'khhlpmfebmkkibipnllkeanfadmigbnj',
          spec: 'spec/*.js',
          helper: 'providers/*.js',
          keepBrowser: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.loadTasks('tasks');

  grunt.registerTask('build', [
    'jshint:providers',
    'concat'
  ]);
  grunt.registerTask('test', [
    'integration'
  ]);
  grunt.registerTask('default', ['build', 'test']);
};


