/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var oAuthRedirectId = "freedom.oauth.redirect.handler";
var chromePermissions;

if (typeof chrome !== 'undefined' &&
   typeof chrome.permissions !== 'undefined') {
  chrome.permissions.getAll(function (permissions) {
    chromePermissions = permissions;
  });
}

var ChromeWebRequestAuth = function() {
  "use strict";
  this.listeners = {};
  this.tabs = {};
};

ChromeWebRequestAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  'use strict';
  var i,j;
  if (typeof chrome !== 'undefined' &&
      typeof chrome.permissions !== 'undefined' && //cca doesn't support chrome.permissions yet
      typeof chrome.tabs !== 'undefined' &&
      typeof chrome.webRequest !== 'undefined' &&
      typeof chromePermissions !== 'undefined' &&
      typeof chromePermissions.origins !== 'undefined') {
    for (i = 0; i < redirectURIs.length; i += 1) {
      for (j = 0; j < chromePermissions.origins.length; j++) {
        if (redirectURIs[i].indexOf(chromePermissions.origins[j]) === 0) {
          continuation({
            redirect: redirectURIs[i],
            state: oAuthRedirectId + Math.random()
          });
          return true;
        }
      }
    }
  }
  return false;
};

ChromeWebRequestAuth.prototype.launchAuthFlow = function(authUrl, stateObj, interactive, continuation) {
  "use strict";
  if (typeof interactive === 'undefined') {
    interactive = true;
  }

  var invokeContinuation = function(url, isError) {
    if (isError) {
      continuation(undefined, 'Error launching auth flow');
    } else {
      continuation(url);
    }
    // Cleanup listeners.
    if (this.listeners.hasOwnProperty(stateObj.state)) {
      chrome.webRequest.onBeforeRequest.removeListener(this.listeners[stateObj.state]);
      delete this.listeners[stateObj.state];
    }
    // Remove Chrome tab.
    if (this.tabs.hasOwnProperty(stateObj.state)) {
      chrome.tabs.remove(this.tabs[stateObj.state].id);
      delete this.tabs[stateObj.state];
    }
  }.bind(this);

  // Set to true when we successfully get credentials.
  var gotCredentials = false;

  // listener function is invoked when Chrome requests the redirect url.
  var listener = function(req) {
    gotCredentials = true;
    invokeContinuation(req.url, false);
  }.bind(this);
  this.listeners[stateObj.state] = listener;
  chrome.webRequest.onBeforeRequest.addListener(listener, {
    types: ["main_frame"],
    urls: [stateObj.redirect]
  });

  chrome.tabs.create({
    url: authUrl,
    active: interactive
  }, function(stateObj, tab) {
    this.tabs[stateObj.state] = tab;
    if (!interactive) {
      // For non-interactive login, close tab and reject if we don't have
      // credentials within 5 seconds.
      setTimeout(function() {
        if (!gotCredentials) {
          invokeContinuation(null, true);
        }
      }.bind(this), 5000);
    }
  }.bind(this, stateObj));

  return state;
};

/**
 * If we're a chrome extension with correct permissions, we can use url watching
 * to monitor any redirect URL.
 */
module.exports = ChromeWebRequestAuth;
