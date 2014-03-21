'use strict';

module.exports = function (grunt) {
  var selenium = require('selenium-standalone');
  var driver = require('wd').promiseChainRemote();
  var path = require('path');
  var temp = require('temporary');
  var async = require('async');
  var fs = require('fs-extra');
  var glob = require('glob');
  var pkg = require('../package.json');
 
  grunt.registerMultiTask('integration', pkg.description, function() {
    var done = this.async();
    var name = this.target;

    var ctx = this.options({
      template: 'spec/helper/',
      spec: 'spec/'
    });

    async.series([
      async.apply(buildSpec, ctx),
      async.apply(startSelenium, ctx),
      async.apply(startDriver, ctx),
      async.apply(runTests, ctx),
      async.apply(cleanup, ctx)
    ], done);
  });
  
  function buildSpec(ctx, next) {
    grunt.log.write('Building...');
    ctx.dir = new temp.Dir();
    var dest = ctx.dir.path + '/app';

    var scripts = glob.sync(ctx.spec);
    var tags = "";
    for (var i = 0; i < scripts.length; i++) {
      tags += "<script type='text/javascript' src='" + scripts[i] + "'></script>";
    }
    tags += "<script type='text/javascript' src='definitions.js'></script>";
    var buffer = new Buffer(tags);

    var dfn = "";
    dfn += "var FILEBASE='" + ctx.dir.path + "';";
    
    fs.mkdirSync(dest);
    fs.mkdirSync(dest + '/spec');
    async.each(scripts, function(s, cb) {
      fs.copy(s, dest + '/spec', cb);
    }, function() {
      fs.copy(ctx.template, dest, function() {
        var fd = fs.openSync(dest + '/main.html', 'a');
        fs.writeSync(fd, buffer, 0, buffer.length, null);
        fs.writeFileSync(dest + '/definitions.js', dfn);
        grunt.log.writeln('Done.');
        next();
      });
    });
  }
  
  function startSelenium(ctx, next) {
    grunt.log.write('Starting Selenium...');
    var server;

    var spawnOptions = { stdio: 'pipe' };
    var seleniumArgs = [
      '-debug'
    ];
    ctx.server = selenium(spawnOptions, seleniumArgs);
    
    // Give Time for server to start.
    setTimeout(function() {
      grunt.log.writeln('Done.');
      next();
    }, 1000);
  };

  function startDriver(ctx,next) {
    ctx.driver = driver.init({
      browserName:'chrome',
      chromeOptions: {
        args: [
          "--load-and-launch-app=" + ctx.dir.path + '/app',
          "--user-data-dir=" + ctx.dir.path,
          "--allow-file-access"
        ]
      }
    })
    .get(ctx.dir.path + 'app/connector.html')
    .then(next);
  }
  
  function runTests(ctx, next) {
    grunt.log.write('Running Tests...');
    grunt.log.writeln('Done.');
    next();
  }
  
  function cleanup(ctx, next) {
    ctx.driver.quit().done();
    ctx.browser.stop();
    if (ctx.dir) {
      ctx.dir.rmdir();
    }
    if (ctx.server) {
      ctx.server.kill();
    }
    next();
  }
};
