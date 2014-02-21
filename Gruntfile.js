var FILES = require('freedom/Gruntfile.js').FILES;
for (var key in FILES) {
  FILES[key] = FILES[key].map(function(str) {
    return 'node_modules/freedom/' + str;
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
            .concat('providers/*.js')
            .concat(FILES.src)
            .concat(FILES.postamble),
        dest: 'freedom.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('freedom-chrome', [
    'jshint:providers',
    'concat'
  ]);
  grunt.registerTask('default', ['freedom-chrome']);
}
