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
      templateId: '',
      spec: 'spec/',
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
    var buffer = new Buffer(tags);
    
    fs.mkdirSync(dest);
    fs.mkdirSync(dest + '/spec');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      tags += "<script type='text/javascript' src='spec/" + s + "'></script>";
      var parent = path.dirname(s);
      fs.mkdirpSync(dest + '/spec/' + parent);
      fs.copySync(s, dest + '/spec/' + s);
    }
    
    fs.copySync(ctx.template, dest);
    var fd = fs.openSync(dest + '/main.html', 'a');
    fs.writeSync(fd, buffer, 0, buffer.length, null);
    grunt.log.writeln('Done.');
    next();
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
    grunt.log.write('Starting Browser...');
    ctx.driver = driver.init({
      browserName:'chrome',
      chromeOptions: {
        args: [
          "--load-extension=" + ctx.dir.path + '/app',
          "--user-data-dir=" + ctx.dir.path
        ]
      }
    }).title().then(function(title) {
      grunt.log.writeln('Done.');
      ctx.driver.get('chrome-extension://' + ctx.templateId + '/main.html').then(next);
    });
  }
  
  function runTests(ctx, next) {
    grunt.log.write('Running Tests...');
    ctx.driver.title().then(function(title) {
      grunt.log.writeln('Done.');
      next();
    });
  }
  
  function cleanup(ctx, next) {
    grunt.log.write('Cleaning Up...');
    ctx.driver.quit().then(function() {
      if (ctx.dir) {
        fs.removeSync(ctx.dir.path);
      }
      if (ctx.server) {
        ctx.server.kill();
      }
      grunt.log.writeln('Done.');
      next();
    });
  }
};
