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

var SPEC_APP_LOCATION = 'build_spec/';



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
    copy: {
      extension: {
        cwd: 'helper/extension/',
        src: '*',
        dest: SPEC_APP_LOCATION,
        expand: true
      },
      specs: {
        cwd: 'extension_spec',
        src: '*',
        dest: SPEC_APP_LOCATION,
        expand: true
      },
      providers: {
        src: 'providers/*',
        dest: SPEC_APP_LOCATION
      },
      grunt: {
        src: '.grunt/grunt-contrib-jasmine/*',
        dest: SPEC_APP_LOCATION
      },
      freedom: {
        src: 'freedom.js',
        dest: SPEC_APP_LOCATION
      }
    },
    clean: ["build_spec"],
    env: {
      jasmine_node: {
        // Will be available to tests as process.env['EXTENSION_PATH'].
        EXTENSION_PATH: SPEC_APP_LOCATION,
        PROFILE_PATH: temp_dir.path
      }
    },
    jasmine_node: {
      forceExit: true,
      captureExceptions: true,
      projectRoot: "spec"
    },
    jasmine: {
      runner: {
        src: [SPEC_APP_LOCATION + 'providers/*.js'],
        options: {
          specs: [SPEC_APP_LOCATION + 'main.spec.js'],
          template: 'helper/template.tmpl',
          outfile: SPEC_APP_LOCATION + 'SpecRunner.html'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  // TODO: Replace grunt-contrib-jasmine with just templating for spec
  // runner generation.
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-jasmine-node-coverage');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-continue');

  grunt.registerTask('freedom-chrome', [
    'jshint:providers',
    'concat'
  ]);
  grunt.registerTask('default', ['freedom-chrome']);
  grunt.registerTask('buildSpecApp', [
    'copy',
    'jasmine:runner:build'
  ]);
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
    grunt.log.writeln("cleanup run");
    server.kill();
    temp_dir.rmdir();
    grunt.log.writeln("Temporary directory " + temp_dir.path + " removed.");
  });
  grunt.registerTask('test', [
    'buildSpecApp',
    'start-selenium-server',
    'env',
    'continueOn',
    'jasmine_node',
    'stop-selenium-server',
    'continueOff'
  ]);
};


