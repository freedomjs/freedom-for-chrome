/*globals chrome,fdom:true,console,Promise*/
/*jslint indent:2,white:true,sloppy:true */
/**
 * A freedom.js interface to Chrome sockets
 * @constructor
 * @private
 * @param {fdom.Port} channel the module creating this provider.
 * @param {Function} dispatchEvent Method for emitting events.
 */
var UdpSocket_chrome = function(channel, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
  this.id = undefined;
};


/**
 * Bind the UDP Socket to a specific host and port.
 * If no addres is specified, 0.0.0.0 will be used.
 * If no port is specified, a local port will be chosen.
 * @param {String?} address The interface to bind on.
 * @param {number?} port The port to bind on
 * @param {Function} continuation A function to call after binding.
 */
UdpSocket_chrome.prototype.bind = function(address, port, continuation) {
  chrome.socket.create('udp', {}, function(createResult) {
    this.id = createResult.socketId;
    chrome.socket.bind(this.id, address, port, function(bindResult) {
      if (bindResult >= 0) {
        continuation(bindResult);
        this.read();
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
    chrome.socket.getInfo(this.id, continuation);
  } else {
    continuation({
      connected: false
    });
  }
};

/**
 * Read from the socket until an error occurs.
 * @method read
 * @private
 */
UdpSocket_chrome.prototype.read = function() {
  chrome.socket.recvFrom(this.id, null, function(recvFromInfo) {
    if (recvFromInfo.resultCode < 0) {
      console.warn('Failed to read from ' + this.id + ': ' +
          recvFromInfo.resultCode);
      return;
    }

    this.dispatchEvent('onData', {
      resultCode: recvFromInfo.resultCode,
      address: recvFromInfo.address,
      port: recvFromInfo.port,
      data: recvFromInfo.data
    });
    this.read();
  }.bind(this));
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

  chrome.socket.sendTo(this.id, data, address, port, function(writeInfo) {
    cb(writeInfo.bytesWritten);
  });
};

/**
 * Destroy a UDP socket.
 * @method destroy
 * @param {Function} continuation Function to call after socket destroyed.
 */
UdpSocket_chrome.prototype.destroy = function(continuation) {
  if (this.id && this.id !== 'INVALID') {
    chrome.socket.destroy(this.id);
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
if (typeof fdom !== 'undefined') {
  fdom.apis.register("core.udpsocket", UdpSocket_chrome);
}
