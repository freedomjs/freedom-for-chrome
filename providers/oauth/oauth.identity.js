/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var oAuthRedirectId = "freedom.oauth.redirect.handler";

var ChromeIdentityAuth = function() {
  "use strict";
  //this.listeners = {};
};

ChromeIdentityAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  "use strict";
  var i;
  if (typeof chrome !== 'undefined' &&
      typeof chrome.permissions !== 'undefined' && //cca doesn't support chrome.permissions yet
      typeof chrome.identity !== 'undefined') { 
    for (i = 0; i < redirectURIs.length; i += 1) {
      if (redirectURIs[i].indexOf('https://') === 0 &&
          redirectURIs[i].indexOf('.chromiumapp.org') > 0) {
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

ChromeIdentityAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  }, function(stateObj, continuation, responseUrl) {
    continuation(responseUrl);
  }.bind({}, stateObj, continuation));
};

/**
 * If we're a chrome extension with correct permissions, we can use url watching
 * to monitor any redirect URL.
 */
module.exports = ChromeIdentityAuth;
