/*globals chrome,fdom:true,console*/
/*jslint indent:2,white:true,sloppy:true */

/**
 * A storage provider using chrome's local extension storage pool.
 * @constructor
 */
var Storage_chrome = function(channel, dispatch) {
  this.dispatchEvents = dispatch;
  this.channel = channel;
};

Storage_chrome.prototype.keys = function(continuation) {
  chrome.storage.local.get(null, function(data) {
    var keys = [], item;
    for (item in data) {
      if (data.hasOwnProperty(item)) {
        keys.push(item);
      }
    }
    continuation(keys);
  });
};

Storage_chrome.prototype.get = function(key, continuation) {
  try {
    // console.log('storage_chrome: looking up ' + key);
    var val = chrome.storage.local.get(key, function(k, cb, items) {
      cb(items[k]);
    }.bind({}, key, continuation));
  } catch(e) {
    continuation(null);
  }
};

Storage_chrome.prototype.set = function(key, value, continuation) {
  // console.log('storage_chrome: saving ' + key);
  var diff = {};
  diff[key] = value;
  chrome.storage.local.set(diff, continuation);
};

Storage_chrome.prototype.remove = function(key, continuation) {
  // console.log('storage_chrome: removing ' + key);
  chrome.storage.local.remove(key, continuation);
};

Storage_chrome.prototype.clear = function(continuation) {
  // console.log('storage_chrome: clear all');
  chrome.storage.local.clear(continuation);
};

/** REGISTER PROVIDER **/
if (typeof fdom !== 'undefined') {
  fdom.apis.register("core.storage", Storage_chrome);
}
