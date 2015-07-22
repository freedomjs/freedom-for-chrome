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

if (typeof window !== 'undefined') {
  window.freedom = require('freedom/src/entry').bind({}, {
    location: window.location.href,
    portType: require('freedom/src/link/worker'),
    source: window.document.head.lastChild.src,
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
