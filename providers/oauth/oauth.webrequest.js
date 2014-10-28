/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

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
exports.register = function (OAuth) {
  'use strict';
  if (typeof chrome !== 'undefined' &&
      typeof chrome.permissions !== 'undefined') { //cca doesn't support chrome.permissions yet
    chrome.permissions.getAll(function (permissions) {
      // Require webRequest permissions.
      if (permissions.permissions.indexOf('webRequest') < 0) {
        return;
      }
      OAuth.register(function (redirectURIs, instance) {
        var i, j;
        for (i = 0; i < redirectURIs.length; i += 1) {
          for (j = 0; j < permissions.origins.length; j += 1) {
            if (redirectURIs[i].indexOf(permissions.origins[j]) === 0) {
              return PromiseCompat.resolve({redirect: redirectURIs[i], state: monitorNav(redirectURIs[i], instance)});
            }
          }
        }
        return false;
      });
    });
  }
};
