var fs = require('fs');
var exec = require('child_process').exec;
var ncp = require('ncp').ncp;
ncp.limit = 16;
var BIN = 'node_modules/cordova/bin/cordova';

function runCordovaCmd(args, errback) {
  var child = exec(BIN + " " + args, function(error, stdout, stderr) {
    console.log('stdout:' + stdout);
    console.log('stderr:' + stderr);
    if (error !== null) {
      errback(error);
    }
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
    ncp('./tools/karma-cordova-launcher/template/','/tmp/cordova_test',function(err) {
      if (err) {
        self.log.error(err);
        emitter.emit('browser_process_failure', self);
        return;
      }
      
      var platforms = self.settings.platforms;
      for (var i=0; i<platforms.length; i++) {
        runCordovaCmd('platform add ' + platforms[i], errorHandler);
      }
      var plugins = self.settings.plugins;
      for (var i=0; i<plugins.length; i++) {
        runCordovaCmd('plugin add ' + plugins[i], errorHandler);
      }
    
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
