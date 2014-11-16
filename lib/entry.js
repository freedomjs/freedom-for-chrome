var providers = [
  require('freedom/providers/core/core.unprivileged'),
  require('freedom/providers/core/echo.unprivileged'),
  require('freedom/providers/core/console.unprivileged'),
  require('freedom/providers/core/peerconnection.unprivileged'),
  require('freedom/providers/core/core.rtcdatachannel'),
  require('freedom/providers/core/core.rtcpeerconnection'),
  require('../providers/core.storage'),
  require('../providers/core.tcpsocket'),
  require('../providers/core.udpsocket'),
  require('freedom/providers/core/core.view'),
  require('freedom/providers/core/core.oauth'),
  require('freedom/providers/core/websocket.unprivileged')
];

if (typeof window !== 'undefined') {
  window.freedom = require('freedom/src/entry').bind({}, {
    location: window.location.href,
    portType: require('freedom/src/link/worker'),
    source: window.document.head.lastChild.src,
    providers: providers,
    oauth: [
      require('../providers/oauth')
    ]
  });
} else {
  require('freedom/src/entry')({
    isModule: true,
    portType: require('freedom/src/link/worker'),
    providers: providers,
    oauth: [
      require('../providers/oauth/oauth.webrequest'),
      require('../providers/oauth/oauth.identity')
    ],
    global: global
  });
}
