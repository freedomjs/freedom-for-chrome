var selenium = require('selenium-standalone');
var path = require('path');
var FILES = require('freedom/Gruntfile.js').FILES;
var temp = require('temporary');

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
  var server;
  var temp_dir = new temp.Dir();
  grunt.log.writeln("Temporary directory " + temp_dir.path + " created.");

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
    env: {
      jasmine_node: {
        // Will be available to tests as process.env['CHROME_EXTENSION_PATH'].
        EXTENSION_PATH: path.resolve('extension_spec'),
        PROFILE_PATH: temp_dir.path
      }
    },
    jasmine_node: {
      forceExit: true,
      captureExceptions: true,
      projectRoot: "spec"
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node-coverage');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-continue');

  grunt.registerTask('freedom-chrome', [
    'jshint:providers',
    'concat'
  ]);
  grunt.registerTask('default', ['freedom-chrome']);
  grunt.registerTask('start-selenium-server', function() {
    var done = this.async();
    var spawnOptions = { stdio: 'pipe' };
    // options to pass to `java -jar selenium-server-standalone-X.XX.X.jar`
    var seleniumArgs = [
      '-debug'
    ];
    server = selenium(spawnOptions, seleniumArgs);
    // TODO: This gives time for the server to start up and start
    // listening. At some point this should use something more
    // accurate than a constant wait.
    setTimeout(done, 1000);
  });
  grunt.registerTask('stop-selenium-server', function() {
    console.log("cleanup run");
    server.kill();
    temp_dir.rmdir();
    grunt.log.writeln("Temporary directory " + temp_dir.path + " removed.");
  });
  grunt.registerTask('test', [
    'start-selenium-server',
    'env',
    'continueOn',
    'jasmine_node',
    'stop-selenium-server',
    'continueOff'
  ]);
};
