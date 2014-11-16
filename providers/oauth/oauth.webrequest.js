/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var oAuthRedirectId = "freedom.oauth.redirect.handler";

var ChromeWebRequestAuth = function() {
  "use strict";
  //this.origins = [];
  this.listeners = {};
  this.tabs = {};
};

ChromeWebRequestAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  'use strict';
  var i;
  if (typeof chrome !== 'undefined' &&
      typeof chrome.permissions !== 'undefined' && //cca doesn't support chrome.permissions yet
      typeof chrome.tabs !== 'undefined' &&
      typeof chrome.webRequest !== 'undefined') { 
    for (i = 0; i < redirectURIs.length; i += 1) {
      if (redirectURIs[i].indexOf('https://') === 0 || 
          redirectURIs[i].indexOf('http://') === 0) {
        continuation({
          redirect: redirectURIs[i],
          state: oAuthRedirectId + Math.random()
        });
        return true;
      }
    }
  }
  return false;
};

ChromeWebRequestAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  "use strict";
  var listener = this.reqListener.bind(this, stateObj, continuation);
  this.listeners[stateObj.state] = listener;
  chrome.webRequest.onBeforeRequest.addListener(listener, {
    types: ["main_frame"],
    urls: [stateObj.redirect]
  });
  
  chrome.tabs.create({
    url: authUrl,
    active: true
  }, function(stateObj, tab) {
    this.tabs[stateObj.state] = tab;
  }.bind(this, stateObj));
  
  return state;
};

  
ChromeWebRequestAuth.prototype.reqListener = function(stateObj, continuation, req) {
  "use strict";
  continuation(req.url);
  if (this.listeners.hasOwnProperty(stateObj.state)) {
    chrome.webRequest.onBeforeRequest.removeListener(this.listeners[stateObj.state]);
    delete this.listeners[stateObj.state];
  }
  if (this.tabs.hasOwnProperty(stateObj.state)) {
    chrome.tabs.remove(this.tabs[stateObj.state].id);
    delete this.tabs[stateObj.state];
  }
};
  
/**
 * If we're a chrome extension with correct permissions, we can use url watching
 * to monitor any redirect URL.
 */
module.exports = ChromeWebRequestAuth;
