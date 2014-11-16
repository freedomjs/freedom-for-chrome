/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var ChromeWebRequestAuth = function() {
  "use strict";
  //this.origins = [];
  this.listeners = {};
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
          state: monitorNav(redirectURIs[i], instance)
        });
        return true;
      }
    }
  }
  return false;
};

ChromeWebRequestAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  'use strict';
  window.open(authUrl);
};

var oAuthFlows = [];
  
function reqListener(req) {
  'use strict';
  var i;
  for (i = 0; i < oAuthFlows.length; i += 1) {
    if (req.url.indexOf(oAuthFlows[i].state) >= 0) {
      oAuthFlows[i].instance.dispatchEvent("oAuthEvent", req.url);
      oAuthFlows.splice(i, 1);
      break;
    }
  }
  chrome.tabs.remove(req.tabId);
  chrome.webRequest.onBeforeRequest.removeListener(reqListener);
}
  
function monitorNav(url, inst) {
  'use strict';
  var state = Math.random();
  oAuthFlows.push({state: state, url: url, instance: inst});
  chrome.webRequest.onBeforeRequest.addListener(reqListener, {
    types: ["main_frame"],
    urls: [url]
  });
  return state;
}

/**
 * If we're a chrome extension with correct permissions, we can use url watching
 * to monitor any redirect URL.
 */
module.exports = ChromeWebRequestAuth;
