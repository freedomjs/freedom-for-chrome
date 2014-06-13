/*globals OAuth, Promise,chrome,console */
/*jslint indent:2,browser:true */
(function () {
  'use strict';
  var oAuthFlows = [];
  
  function reqListener(req) {
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
    var state = Math.random();
    oAuthFlows.push({state: state, url: url, instance: inst});
    chrome.webRequest.onBeforeRequest.addListener(reqListener, {
      types: ["main_frame"],
      urls: [url]
    });
    return state;
  }

  /**
   * If we have a local domain, and freedom.js is loaded at startup, we can use
   * the local page as a redirect URI.
   */
  if (typeof chrome !== 'undefined') {
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
              return Promise.resolve({redirect: redirectURIs[i], state: monitorNav(redirectURIs[i], instance)});
            }
          }
        }
        return false;
      });
    });
  }
}());