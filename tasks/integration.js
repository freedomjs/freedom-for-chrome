'use strict';

module.exports = function (grunt) {
  var selenium = require('selenium-standalone');
  var http = require('http');
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
      runId: Math.round(Math.random() * 100000),
      helper: undefined,
      keepBrowser: false,
      port: 9989,
      timeout : 10000
    });
    
    ctx.done = done;
    
    process.on('SIGINT', function() {
      cleanup(ctx);
    });
    ctx.cleanupTimeout = setTimeout(cleanup.bind({}, ctx), ctx.timeout);

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
    if (ctx.helper) {
      scripts = scripts.concat(glob.sync(ctx.helper));
    }
    var tags = "";
    
    fs.mkdirSync(dest);
    fs.mkdirSync(dest + '/spec');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      tags += "<script type='text/javascript' src='spec/" + s + "'></script>";
      var parent = path.dirname(s);
      fs.mkdirpSync(dest + '/spec/' + parent);
      fs.copySync(s, dest + '/spec/' + s);
    }
    tags += "<script type='text/javascript' src='relay.js?id=freedomforchrome" + ctx.runId + "'></script>";
    var buffer = new Buffer(tags);
    
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
    
    ctx.web = http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<html>' +
              '<script type=text/javascript>' +
              'window.messages = [];' +
              'var ws = new WebSocket("wss://p2pbr.com/route/freedomforchrome' + ctx.runId + '");' +
              'ws.onmessage = function(m) {' + 
              '  var msg = JSON.parse(m.data);' +
              '  if (msg.cmd == "message") {' +
              '  window.messages.push(msg.msg);' +
              '}}' +
              '</script>' +
              '</html>');
    }).listen(ctx.port);
    
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
          "--load-and-launch-app=" + ctx.dir.path + '/app',
          "--user-data-dir=" + ctx.dir.path
        ]
      }
    }).title().then(function(title) {
      if (title === 'SpecRunner') {
        grunt.log.writeln('Done. [attaching to app allowed]');
        ctx.direct = true;
        next();
      } else {
        ctx.direct = false;
        grunt.log.writeln('Done. [attaching to app disallowed]');
        ctx.driver.get('http://localhost:' + ctx.port).then(next);
      }
    });
  }
  
  function testPoll(dri, cb) {
    dri.eval("window.messages.length > 0").then(function(response) {
      if (response) {
        cb();
      } else {
        setTimeout(testPoll.bind({}, dri, cb), 500);
      }
    });
  }
  
  function runTests(ctx, next) {
    grunt.log.write('Running Tests...');
    testPoll(ctx.driver, function(ctx) {
      grunt.log.writeln('Done.');
      ctx.driver.eval("JSON.stringify(window.messages[0])").then(function(result) {
        var parse = JSON.parse(result);
        ctx.status = {failed: 0};
        for (var i = 0; i < parse.length; i++) {
          var spec = parse[i];
          if (process.stdout.clearLine) {
            var chalk = require('chalk');
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            if (spec.status === 'passed') {
              grunt.log.writeln(chalk.green.bold('✓') + '\t' + spec.fullName);
            } else if (spec.status === 'failed') {
              ctx.status.failed++;
              grunt.log.writeln(chalk.red.bold('X') + '\t' + spec.fullName);
            } else {
              grunt.log.writeln(chalk.yellow.bold('*') + '\t' + spec.fullName);
            }
          } else {
            if (spec.status === 'passed') {
              grunt.log.writeln('✓' + spec.fullName);
            } else if (spec.status === 'failed') {
              ctx.status.failed++;
              grunt.log.writeln('X' + spec.fullName);
            } else {
              grunt.log.writeln('*' + spec.fullName);
            }
          }
        }
        next();
      }, function(err) {
        grunt.log.writeln(chalk.red.bold('Error!'))
        grunt.log.writeln(err);
        next();
      });
    }.bind({}, ctx));
  }
  
  function cleanup(ctx, next) {
    var good = true;
    if (ctx.cleanupTimeout) {
      clearTimeout(ctx.cleanupTimeout);
    }
    if (!next) {
      next = ctx.done;
    }
    if (!ctx.status) {
      grunt.log.error('Timed out');
      good = false;
    } else if (ctx.status.failed === 0) {
      grunt.log.ok('0 failures');
    } else {
      grunt.log.error(ctx.status.failed + ' failures');
      good = false;
    }
    fs.removeSync(ctx.dir.path);
    if (ctx.keepBrowser) {
      return next(good);
    }

    ctx.driver.close().quit();
    setTimeout(function() {
      ctx.server && ctx.server.kill();
    }, 500);
    setTimeout(function() {
      next(good);
    }, 1000);
  }
};
