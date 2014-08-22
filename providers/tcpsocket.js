/*globals chrome,fdom:true,console,Promise*/
/*jslint indent:2,white:true,sloppy:true */
/**
 * A freedom.js interface to Chrome sockets
 * @constructor
 * @private
 * @param {fdom.Port} channel the module creating this provider.
 * @param {Function} dispatchEvent Method for emitting events.
 * @param {number?} id A pre-existing socket Id for the socket.
 */
var Socket_chrome = function(channel, dispatchEvent, id) {
  this.dispatchEvent = dispatchEvent;
  this.id = id || undefined;
  this.namespace = chrome.sockets.tcp;
  if (this.id) {
    Socket_chrome.addActive(this.id, this);
    chrome.sockets.tcp.setPaused(this.id, false, function() {
      console.log('Unpaused receiver');
    });
  }
};

/**
 * A static list of active sockets, so that global on-receive messages
 * from chrome can be routed properly.
 * @static
 * @private
 * @type {Object.<number,Socket_chrome>}
 */
Socket_chrome.active = {};

/**
 * Get Information about the socket.
 * @method getInfo
 * @param {Function} continuation Function to call with information.
 * @return {Object} connection and address information about the socket.
 */
Socket_chrome.prototype.getInfo = function(continuation) {
  if (this.id) {
    // Note: this.namespace used, since this method is common to tcp and
    // tcpServer sockets.
    this.namespace.getInfo(this.id, continuation);
  } else {
    continuation({
      connected: false
    });
  }
};

/**
 * Connect to a designated location and begin reading.
 * @method connect
 * @param {String} hostname The host or ip to connect to.
 * @param {number} port The port to connect on.
 * @param {Function} cb Function to call with completion or error.
 */
Socket_chrome.prototype.connect = function(hostname, port, cb) {
  if (this.id) {
    cb(undefined, {
      "errcode": "ALREADY_CONNECTED",
      "message": "Cannot Connect Existing Socket"
    });
    return;
  }
  chrome.sockets.tcp.create({}, function(createInfo) {
    this.id = createInfo.socketId;
    chrome.sockets.tcp.connect(this.id, hostname, port, function (result) {
      if (result < 0) {
        cb(undefined, {
          "errcode": "CONNECTION_FAILED",
          "message": "Chrome Connection Failed: " +
              Socket_chrome.ERROR_MAP[result]
        });
      } else {
        Socket_chrome.addActive(this.id, this);
        cb();
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Write data to the socket.
 * @method write
 * @param {ArrayBuffer} data The data to write
 * @param {Function} cb Function to call when data is written
 */
Socket_chrome.prototype.write = function(data, cb) {
  if (!this.id) {
    cb(undefined, {
      "errcode": "NOT_CONNECTED",
      "message": "Cannot Write on Closed Socket"
    });
    return;
  }

  chrome.sockets.tcp.send(this.id, data, function(sendInfo) {
    if (sendInfo.resultCode < 0) {
      Socket_chrome.removeActive(this.id);
      return cb(undefined, {
        "errcode": Socket_chrome.errorStringOfCode(sendInfo.resultCode),
        "message": "Send Error: " + sendInfo.resultCode
      });
    } else if (sendInfo.bytesSent !== data.byteLength) {
      Socket_chrome.removeActive(this.id);
      return cb(undefined, {
        "errcode": "CONNECTION_RESET",
        "message": "Write Partially completed."
      });
    }
    cb();
  }.bind(this));
};


// Error codes are at:
// https://code.google.com/p/chromium/codesearch#
//     chromium/src/net/base/net_error_list.h
Socket_chrome.ERROR_MAP = {
  '-1': 'IO_PENDING',
  '-2': 'FAILED',
  '-3': 'ABORTED',
  '-4': 'INVALID_ARGUMENT',
  '-5': 'INVALID_HANDLE',
  '-7': 'TIMED_OUT',
  '-13': 'OUT_OF_MEMORY',
  '-15': 'SOCKET_NOT_CONNECTED',
  '-21': 'NETWORK_CHANGED',
  '-23': 'SOCKET_IS_CONNECTED',
  '-100': 'CONNECTION_CLOSED',
  '-101': 'CONNECTION_RESET',
  '-102': 'CONNECTION_REFUSED',
  '-103': 'CONNECTION_ABORTED',
  '-104': 'CONNECTION_FAILED',
  '-105': 'NAME_NOT_RESOLVED',
  '-106': 'INTERNET_DISCONNECTED',
  '-1000': 'GENERIC_CORDOVA_FAILURE'  //See Cordova Plugin socket.js
};

/**
 * Get the error code associated with a chrome.socket error code.
 * @method errorStringOfCode
 * @static
 * @private
 * @param {Number} code The error number as described by chrome
 * @returns {String} The error code as defined in the freedom.js interface.
 */
Socket_chrome.errorStringOfCode = function(code) {
  return Socket_chrome.ERROR_MAP[String(code)] ||
      'UNKNOWN';
};

/*
 * Alert a consumer that a socket is disconnected, with appropriate
 * error message.
 * @method dispatchDisconnect
 * @private
 * @param {Number} code the code returned by chrome when the socket closed.
 */
Socket_chrome.prototype.dispatchDisconnect = function (code) {
  if (code === 0) {
    this.dispatchEvent('onDisconnect', {
      errcode: 'SUCCESS',
      message: 'Socket closed by call to close'
    });
  } else if(code === -100) {
    this.dispatchEvent('onDisconnect', {
      errcode: 'CONNECTION_CLOSED',
      message: 'Connection closed gracefully'
    });
  } else {
    this.dispatchEvent('onDisconnect', {
      errcode: Socket_chrome.errorStringOfCode(code),
      message: 'Socket Error: ' + code
    });
  }
};

/**
 * Mark a socket as active, so that dispatched events can be routed to it.
 * This method is needed because chrome.sockets exposes a single event handler
 * for incoming data across all sockets.
 * @method addActive
 * @static
 * @param {number} id The socketId as provided by chrome.sockets
 * @param {Socket_chrome} socket The socket class associated with the id.
 */
Socket_chrome.addActive = function(id, socket) {
  if (Object.keys(Socket_chrome.active).length === 0) {
    if (chrome.sockets.tcp) {
      chrome.sockets.tcp.onReceive.addListener(Socket_chrome.handleReadData);
      chrome.sockets.tcp.onReceiveError.addListener(
          Socket_chrome.handleReadError);
    }
    if (chrome.sockets.tcpServer) {
      chrome.sockets.tcpServer.onAccept.addListener(
          Socket_chrome.handleAccept);
      chrome.sockets.tcpServer.onAcceptError.addListener(
          Socket_chrome.handleAcceptError);
    }
  }
  Socket_chrome.active[id] = socket;
};

/**
 * Unmark a socket as active, and clean up event handlers if needed.
 * @method removeActive
 * @static
 * @param {number} id The socketId to no longer watch.
 */
Socket_chrome.removeActive = function(id) {
  delete Socket_chrome.active[id];
  if (Object.keys(Socket_chrome.active).length === 0) {
    if (chrome.sockets.tcp) {
      chrome.sockets.tcp.onReceive.removeListener(
          Socket_chrome.handleReadData);
      chrome.sockets.tcp.onReceiveError.removeListener(
          Socket_chrome.handleReadError);
    }
    if (chrome.sockets.tcpServer) {
      chrome.sockets.tcpServer.onAccept.removeListener(
          Socket_chrome.handleAccept);
      chrome.sockets.tcpServer.onAcceptError.removeListener(
          Socket_chrome.handleAcceptError);
    }
  }
};

/**
 * React to read data.
 * @method handleReadData
 * @private
 * @param {ReadInfo} readInfo The value returned by onReceive.
 * @static
 */
Socket_chrome.handleReadData = function (readInfo) {
  if (!Socket_chrome.active[readInfo.socketId]) {
    console.warn('Dropped Read: ', readInfo);
    return;
  }
  Socket_chrome.active[readInfo.socketId].dispatchEvent('onData', {data: readInfo.data});
};

/**
 * React to read errors.
 * @method handleReadError
 * @private
 * @param {readInfo} readInfo The value returned by onReceiveError.
 * @static
 */
Socket_chrome.handleReadError = function (readInfo) {
  if (!Socket_chrome.active[readInfo.socketId]) {
    console.warn('Dropped Read Error: ', readInfo);
    return;
  }
  Socket_chrome.active[readInfo.socketId].dispatchDisconnect(readInfo.resultCode);
  Socket_chrome.removeActive(readInfo.socketId);
};

/**
 * React to client accepts.
 * @method handleAccept
 * @private
 * @param {acceptInfo} acceptInfo The value returned by onAccept.
 * @static
 */
Socket_chrome.handleAccept = function (acceptInfo) {
  if (!Socket_chrome.active[acceptInfo.socketId]) {
    console.warn('Dropped Accept: ', acceptInfo);
    return;
  }

  chrome.sockets.tcp.getInfo(acceptInfo.clientSocketId, function(info) {
    Socket_chrome.active[acceptInfo.socketId].dispatchEvent('onConnection', {
      socket: acceptInfo.clientSocketId,
      host: info.peerAddress,
      port: info.peerPort
    });
  });
};

/**
 * React to client accept errors.
 * @method handleAcceptError
 * @private
 * @param {info} info The value returned by onAcceptError.
 * @static
 */
Socket_chrome.handleAcceptError = function (info) {
  if (!Socket_chrome.active[info.socketId]) {
    console.warn('Dropped Accept Error: ', info);
    return;
  }

  Socket_chrome.active[info.socketId].dispatchDisconnect(info.resultCode);
  Socket_chrome.removeActive(info.socketId);
};

/**
 * Listen on a socket to accept new clients.
 * @method listen
 * @param {String} address the address to listen on
 * @param {number} port the port to listen on
 * @param {Function} callback Callback to call when listening has occured.
 */
Socket_chrome.prototype.listen = function(address, port, callback) {
  if (this.id) {
    callback(undefined, {
      errcode: "ALREADY_CONNECTED",
      message: "Cannot Listen on existing socket."
    });
    return;
  }
  this.namespace = chrome.sockets.tcpServer;
  chrome.sockets.tcpServer.create({}, function(createInfo) {
    this.id = createInfo.socketId;
    // See https://developer.chrome.com/apps/socket#method-listen
    chrome.sockets.tcpServer.listen(this.id, address, port,
        // TODO: find out what the default is, and what this really means, the
        // webpage is pretty sparse on it:
        //   https://developer.chrome.com/apps/socket#method-listen
        //
        // Length of the socket's listen queue (number of pending connections
        // to open)
        100,
        this.startAcceptLoop.bind(this, callback));
  }.bind(this));
};

/**
 * @method startAcceptLoop
 * @param {Function} callbackFromListen Resolves Freedom's promise for
 * |this.listen|
 * @param {number} result The argument |result| comes from the callback in
 * |chrome.socket.listen|. Its value is a number that represents a chrome
 * socket error, as specified in:
 * https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
 * @private
 */
Socket_chrome.prototype.startAcceptLoop =
    function(callbackFromListen, result) {
  var errorMsg;

  if (result !== 0) {
    if (Socket_chrome.ERROR_MAP.hasOwnProperty(result)) {
      errorMsg = "Chrome Listen failed: " + Socket_chrome.ERROR_MAP[result];
    } else {
      errorMsg = "Chrome Listen failed: Unknown code " + result;
    }
    callbackFromListen(undefined, {
      errcode: "CONNECTION_FAILURE",
      message: errorMsg
    });
    return;
  }

  callbackFromListen();
  Socket_chrome.addActive(this.id, this);
};

/**
 * Close and Destroy a socket
 * @method close
 * @param {Function} continuation Function to call once socket is destroyed.
 */
Socket_chrome.prototype.close = function(continuation) {
  if (this.id) {
    Socket_chrome.removeActive(this.id);
    // Note: this.namespace used, since this method is common to tcp and
    // tcpServer sockets.
    this.namespace.disconnect(this.id, function() {});
    delete this.id;
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
  fdom.apis.register("core.tcpsocket", Socket_chrome);
}
