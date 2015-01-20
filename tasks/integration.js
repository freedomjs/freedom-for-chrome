'use strict';

module.exports = function (grunt) {
  var selenium = require('selenium-standalone');
  var http = require('http');
  var driver = require('wd').promiseChainRemote();
  var path = require('path');
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
      helper: undefined,
      keepBrowser: false,
      port: 9989,
      timeout : 30000
    });
    
    ctx.done = done;
    
    process.on('SIGINT', function() {
      cleanup(ctx);
    });
    ctx.cleanupTimeout = setTimeout(cleanup.bind({}, ctx), ctx.timeout);

    async.series([
      async.apply(buildSpec, ctx),
      async.apply(installSelenium, ctx),
      async.apply(startSelenium, ctx),
      async.apply(startDriver, ctx),
      async.apply(runTests, ctx),
      async.apply(finishTests, ctx),
      async.apply(cleanup, ctx)
    ], done);
  });
  
  function getFiles(specs) {
    var out = [];
    if (specs instanceof Array) {
      specs.forEach(function(spec) {
        out = out.concat(getFiles(spec));
      });
    } else if (specs.path) {
      out = glob.sync(specs.path).map(function(path) {
        return {
          path: path,
          include: specs.include,
          name: specs.name || path
        }
      });
    } else {
      out = glob.sync(specs);
    }
    return out;
  }
  
  function buildSpec(ctx, next) {
    grunt.log.write('Building...');
    ctx.dir = fs.mkdirpSync('.build') || fs.realpathSync('.build');
    var dest = ctx.dir + '/app';

    var scripts = getFiles(ctx.spec);
    if (ctx.helper) {
      scripts = scripts.concat(getFiles(ctx.helper));
    }
    var tags = "";
    
    fs.mkdirpSync(dest + '/scripts');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      var spath = s.path || s;
      var sname = s.name || s;
      if (!s.path || s.include) {
        tags += "<script type='text/javascript' src='scripts/" + sname + "'></script>";
      }
      var parent = path.dirname(sname);
      fs.mkdirpSync(dest + '/scripts/' + parent);
      fs.copySync(spath, dest + '/scripts/' + sname);
    }
    tags += "<script type='text/javascript' src='relay.js?port=" + ctx.port + "'></script>";
    var buffer = new Buffer(tags);
    
    fs.copySync(ctx.template, dest);
    var fd = fs.openSync(dest + '/main.html', 'a');
    fs.writeSync(fd, buffer, 0, buffer.length, null);
    grunt.log.writeln('Done.');
    next();
  }

  function installSelenium(ctx, next) {
    grunt.log.write('Checking Selenium...');
    selenium.install(next);
  }

  function startSelenium(ctx, next) {
    grunt.log.writeln('Done.');
    grunt.log.write('Starting Selenium...');

    selenium.start({
      spawnOptions: { 
        //stdio: 'pipe'
      },
      seleniumArgs: [
        '-debug'
      ]
    }, function (err, child) {
      if (err) {
        grunt.fail.warn(err);
      }
      ctx.server = child;
      grunt.log.writeln('Done.');
      next();
    });
    ctx.messages = [];
    ctx.inprogress = '';
    ctx.web = http.createServer(function (req, res) {
      if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<html>' +
                'Hi, App should also load.' +
                '</html>');
      } else if (req.url === '/put') {
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
          ctx.inprogress += chunk;
        });
        req.on('end', function() {
          ctx.messages.push(ctx.inprogress);
          ctx.inprogress = '';
          res.end('Okay.');
          ctx.onMessage && ctx.onMessage();
        });
      } else if (req.url === '/ready') {
          grunt.log.writeln('Done.')
          res.end('Okay.');
          ctx.onMessage && ctx.onMessage();
      }
    }).listen(ctx.port);
  };

  function startDriver(ctx,next) {
    grunt.log.write('Starting Browser...');
    ctx.onMessage = next;
    ctx.driver = driver.init({
      browserName:'chrome',
      chromeOptions: {
        args: [
          "--load-and-launch-app=" + ctx.dir + "/app",
          "--user-data-dir=" + ctx.dir
        ]
      }
    });
  }
  
  function testPoll(ctx, cb) {
    if (ctx.messages.length > 0) {
      cb();
    } else {
      setTimeout(testPole.bind({}, ctx, cb), 500);
    }
  }
  
  function runTests(ctx, next) {
    grunt.log.write('Running Tests...');
    clearTimeout(ctx.cleanupTimeout);
    ctx.onMessage = function() {
      grunt.log.writeln('Done.');
      next();
    }
  }
  
  function finishTests(ctx, next) {
    grunt.log.write('Reporting on Tests...');
    testPoll(ctx, function(ctx) {
      grunt.log.writeln('Done.');
      var parse = JSON.parse(ctx.messages[0]);
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
    if (ctx.keepBrowser) {
      return next(good || new Error('One or more tests failed.'));
    }

    fs.removeSync(ctx.dir);
    ctx.driver.quit();
    ctx.web.close();
    setTimeout(function() {
      ctx.server && ctx.server.kill();
    }, 500);
    setTimeout(function() {
      next(good || new Error('One or more tests failed.'));
    }, 1000);
  }
};
