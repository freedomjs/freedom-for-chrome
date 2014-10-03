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

/**
 * Get the keys currently stored in storage.
 * @method keys
 * @param {Function} continuation Function to call with array of keys.
 */
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

/**
 * Get an item from storage.
 * @method get
 * @param {String} key The key to get
 * @param {Function} continuation The function to call with the data of the key,
 *   or null if the key does not exist.
 */
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

/**
 * Set an item in the store.
 * @param {String} key The key to set.
 * @param {String} value The data to set for the key.
 * @param {Function} continuation Function to call when the data is stored.
 */
Storage_chrome.prototype.set = function(key, value, continuation) {
  // console.log('storage_chrome: saving ' + key);
  var diff = {};
  diff[key] = value;
  chrome.storage.local.set(diff, continuation);
};

/**
 * Remove a key from the store.
 * @method remove
 * @param {String} key The key to remove
 * @param {Function} continuation Function to call when key is removed.
 */
Storage_chrome.prototype.remove = function(key, continuation) {
  // console.log('storage_chrome: removing ' + key);
  chrome.storage.local.remove(key, continuation);
};

/**
 * Reset the store
 * @method clear
 * @param {Function} continuation Function to call when store is reset.
 */
Storage_chrome.prototype.clear = function(continuation) {
  // console.log('storage_chrome: clear all');
  chrome.storage.local.clear(continuation);
};

/** REGISTER PROVIDER **/
exports.provider = Storage_chrome;
exports.name = 'core.storage';
