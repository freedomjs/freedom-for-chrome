/*globals chrome,console,Promise*/
/*jslint indent:2,white:true,node:true,sloppy:true */
/**
 * A freedom.js interface to Chrome sockets
 * @constructor
 * @private
 * @param {} cap Capabilities for the provider
 * @param {Function} dispatchEvent Method for emitting events.
 */
var UdpSocket_chrome = function(cap, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
  this.id = undefined;
};

/**
 * A static list of active sockets, so that global on-receive messages
 * from chrome can be routed properly.
 * @static
 * @private
 */
UdpSocket_chrome.active = {};

/**
 * Bind the UDP Socket to a specific host and port.
 * If no addres is specified, 0.0.0.0 will be used.
 * If no port is specified, a local port will be chosen.
 * @param {String?} address The interface to bind on.
 * @param {number?} port The port to bind on
 * @param {Function} continuation A function to call after binding.
 */
UdpSocket_chrome.prototype.bind = function(address, port, continuation) {
  chrome.sockets.udp.create({}, function(createResult) {
    this.id = createResult.socketId;
    chrome.sockets.udp.bind(this.id, address, port, function(bindResult) {
      if (bindResult >= 0) {
        continuation(bindResult);
        UdpSocket_chrome.addActive(this.id, this);
      } else {
        continuation(undefined, {
          errcode: "BIND_FAILED",
          message: "Failed to Bind: " + bindResult
        });
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Get Information about the socket.
 * @method getInfo
 * @return {Object} connection and address information about the socket.
 */
UdpSocket_chrome.prototype.getInfo = function(continuation) {
  if (this.id) {
    chrome.sockets.udp.getInfo(this.id, continuation);
  } else {
    continuation({
      connected: false
    });
  }
};

UdpSocket_chrome.addActive = function(id, socket) {
  if (Object.keys(UdpSocket_chrome.active).length === 0) {
    chrome.sockets.udp.onReceive.addListener(UdpSocket_chrome.handleReadData);
    chrome.sockets.udp.onReceiveError.addListener(
        UdpSocket_chrome.handleReadError);
  }
  UdpSocket_chrome.active[id] = socket;
};

UdpSocket_chrome.removeActive = function(id) {
  delete UdpSocket_chrome.active[id];
  if (Object.keys(UdpSocket_chrome.active).length === 0) {
    chrome.sockets.udp.onReceive.removeListener(
        UdpSocket_chrome.handleReadData);
    chrome.sockets.udp.onReceiveError.removeListener(
        UdpSocket_chrome.handleReadError);
  }
};


/**
 * Handle data received on a socket
 * @method handleReadData
 * @static
 * @private
 */
UdpSocket_chrome.handleReadData = function(info) {
  UdpSocket_chrome.active[info.socketId].dispatchEvent('onData', {
    resultCode:0,
    address: info.remoteAddress,
    port: info.remotePort,
    data: info.data
  });
};

/**
 * Handle errors received on a socket
 * @method handleReadError
 * @static
 * @private
 */
UdpSocket_chrome.handleReadError = function(info) {
  UdpSocket_chrome.active[info.socketId].dispatchEvent('onData', {
    resultCode:info.resultCode
  });
};

/**
 * Send data on this socket to a host and port.
 * @method sendTo
 * @param {ArrayBuffer} data The data to send.
 * @param {String} address The destination address
 * @param {number} port The destination port
 * @param {Function} cb A function to call after writing completes.
 */
UdpSocket_chrome.prototype.sendTo = function(data, address, port, cb) {
  if (!this.id) {
    cb(undefined, {
      "errcode": "SOCKET_CLOSED",
      "message": "Cannot Write on Closed Socket"
    });
    return;
  }

  chrome.sockets.udp.send(this.id, data, address, port, function(writeInfo) {
    cb(writeInfo.bytesSent);
  });
};

/**
 * Destroy a UDP socket.
 * @method destroy
 * @param {Function} continuation Function to call after socket destroyed.
 */
UdpSocket_chrome.prototype.destroy = function(continuation) {
  if (this.id && this.id !== 'INVALID') {
    chrome.sockets.udp.close(this.id);
    this.id = 'INVALID';
    continuation();
  } else {
    continuation(undefined, {
      "errcode": "SOCKET_CLOSED",
      "message": "Socket Already Closed"
    });
  }
};

/** REGISTER PROVIDER **/
exports.provider = UdpSocket_chrome;
exports.name = 'core.udpsocket';
