var providers = [
  require('freedom/providers/core/core.unprivileged'),
  require('freedom/providers/core/echo.unprivileged'),
  require('freedom/providers/core/logger.console'),
  require('freedom/providers/core/peerconnection.unprivileged'),
  require('../providers/core.storage'),
  require('../providers/core.tcpsocket'),
  require('../providers/core.udpsocket'),
  require('freedom/providers/core/view.unprivileged'),
  require('freedom/providers/core/websocket.unprivileged')
];

var oauth = require('freedom/providers/core/oauth');
require('../providers/oauth').register(oauth);

providers.push(oauth);


if (typeof window !== 'undefined') {
  window.freedom = require('freedom/src/entry').bind({}, {
    location: window.location.href,
    portType: require('freedom/src/link/worker'),
    source: window.document.head.lastChild.src,
    providers: providers
  });
} else {
  require('freedom/src/entry')({
    isModule: true,
    portType: require('freedom/src/link/worker'),
    providers: providers,
    global: global
  });
}
