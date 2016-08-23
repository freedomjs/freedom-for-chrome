var providers = [
  require('freedom/providers/core/core.unprivileged'),
  require('freedom/providers/core/core.echo'),
  require('freedom/providers/core/core.battery'),
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

var findSrc = function(doc) {
  // The script tag that loads freedom can be in the header (in some manually
  // created background pages) or in the body (as in the case of automatically
  // created background pages.  There may also be other scripts loaded
  // before (and after) freedom-for-chrome.
  var tags = doc.getElementsByTagName('script');
  for (var i = 0; i < tags.length; ++i) {
    if (tags[i].src.indexOf('freedom-for-chrome') !== -1) {
      return tags[i].src;
    }
  }
  throw new Error('No script tag for freedom-for-chrome!');
};

if (typeof window !== 'undefined') {
  window.freedom = require('freedom/src/entry').bind({}, {
    location: window.location.href,
    portType: require('freedom/src/link/worker'),
    source: findSrc(window.document),
    providers: providers,
    oauth: [
      require('../providers/oauth/oauth.identity'),
      require('../providers/oauth/oauth.webrequest'),
    ]
  });
} else {
  require('freedom/src/entry')({
    isModule: true,
    portType: require('freedom/src/link/worker'),
    providers: providers,
    global: global
  });
}
