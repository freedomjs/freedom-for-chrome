var fs = require('fs');
var spawn = require('child-process-promise').spawn;
var ncp = require('ncp').ncp;
ncp.limit = 16;
var BIN = 'cordova';
var CORDOVA_DIR = '/tmp/cordova_test';
var TEMPLATE_DIR = __dirname + '/' + 'template/';

function runCordovaCmd(args) {
  return spawn(BIN, args, {
    cwd: CORDOVA_DIR
  }).progress(function(childProcess) {
    childProcess.stdout.on('data', function(data) {
      console.log('[spawn] stdout: ' + data.toString());
    });
    childProcess.stderr.on('data', function(data) {
      console.error('[spawn] stderr: ' + data.toString());
    });
  });
}

var Cordova = function(id, emitter, args, logger, config) {
  var self = this;
  self.settings = config.cordovaSettings;
  self.log = logger.create('launcher.cordova');
  self.name = self.platform + " on Cordova";

  console.log(self.settings);

  var errorHandler = function(err) {
    self.log.error(err);
    emitter.emit('browser_process_failure', self);
  };

  this.start = function(url) {
    self.log.debug("Starting at " + url);
    ncp(TEMPLATE_DIR, CORDOVA_DIR, function(err) {
      if (err) {
        self.log.error(err);
        emitter.emit('browser_process_failure', self);
        return;
      }
      
      var platforms = self.settings.platforms;
      var plugins = self.settings.plugins;
      var promise = runCordovaCmd(['plugin', 'add'].concat(plugins)).fail(errorHandler);
      
      for (var i=0; i<platforms.length; i++) {
        promise = promise.then(
          runCordovaCmd.bind({}, ['platform', 'add', platforms[i]]),
          runCordovaCmd.bind({}, ['platform', 'add', platforms[i]])
        );
      }
      promise = promise.then(function(result) {
        console.log('Done adding platforms');
      }, function(err) {
        console.log('Done adding platforms');
      });
      
      promise = promise.then(runCordovaCmd.bind({}, ['build']), errorHandler);
      promise.then(function() {
        for (var i=0; i<platforms.length; i++) {
          runCordovaCmd(['emulate', platforms[i]], errorHandler); 
        }
      }, errorHandler);
      
    });
  };

  this.kill = function(done) {
    self.log.debug("Killing");
    done();
  };
  
  this.toString = function() {
    return self.name;
  };

};

// PUBLISH DI MODULE
module.exports = {
  'launcher:Cordova': ['type', Cordova]
};
