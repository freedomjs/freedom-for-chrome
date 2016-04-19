var providers = [
  require('freedom/providers/core/core.unprivileged'),
  require('freedom/providers/core/core.echo'),
  require('freedom/providers/core/core.console'),
  require('freedom/providers/core/core.crypto'),
  require('freedom/providers/core/core.peerconnection'),
  require('freedom/providers/core/core.rtcdatachannel'),
  require('freedom/providers/core/core.rtcpeerconnection'),
  require('../providers/core.storage'),
  require('../providers/core.tcpsocket'),
  require('../providers/core.udpsocket'),
  require('freedom/providers/core/core.view'),
  require('freedom/providers/core/core.oauth'),
  require('freedom/providers/core/core.websocket'),
  require('freedom/providers/core/core.xhr')
];

// In frame mode, modules are distinguished by appending "#isModule" to the
// script src.
var scriptTags = document.getElementsByTagName('script');
var thisScriptTag = scriptTags[scriptTags.length - 1];
var src = thisScriptTag.src;
var fragment = src.split('#')[1];

if (fragment !== 'isModule') {
  window.freedom = require('freedom/src/entry').bind({}, {
    location: window.location.href,
    portType: require('freedom/src/link/frame'),
    source: src,
    providers: providers,
    oauth: [
      require('../providers/oauth/oauth.identity'),
      require('../providers/oauth/oauth.webrequest'),
    ]
  });
} else {
  require('freedom/src/entry')({
    isModule: true,
    portType: require('freedom/src/link/frame'),
    providers: providers,
    global: global
  });
}
