/*globals chrome,fdom:true,console,Promise*/
/*jslint indent:2,white:true,sloppy:true */
/**
 * A freedom.js interface to Chrome sockets
 * @constructor
 * @private
 * @param {} cap Capabilities for the provider
 * @param {Function} dispatchEvent Method for emitting events.
 * @param {number?} id A pre-existing socket Id for the socket.
 */
var Socket_chrome = function(cap, dispatchEvent, id) {
  this.dispatchEvent = dispatchEvent;
  this.id = id || undefined;
  this.namespace = chrome.sockets.tcp;
  this.prepareSecureCalled = false;
  if (this.id) {
    Socket_chrome.addActive(this);
    chrome.sockets.tcp.setPaused(this.id, false);
  }
};

/**
 * A static list of active sockets, so that global on-receive messages
 * from chrome can be routed properly.
 * @static
 * @private
 * @type {Object.<string,Socket_chrome>}
 * @see Socket_chrome.keyForActive
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
      'errcode': 'ALREADY_CONNECTED',
      'message': 'Cannot Connect Existing Socket'
    });
    return;
  }
  chrome.sockets.tcp.create({}, function(createInfo) {
    this.id = createInfo.socketId;
    try {
      chrome.sockets.tcp.connect(this.id, hostname, port, function (result) {
        if (result < 0) {
          var errorString = Socket_chrome.errorStringOfCode(result);
          var freedomErrorCode = Socket_chrome.freedomErrorCode(errorString);
          cb(undefined, {
            'errcode': freedomErrorCode,
            'message': 'Chrome Connection Failed: ' + errorString +
                ' ' + chrome.runtime.lastError.message
          });
        } else {
          Socket_chrome.addActive(this);
          cb();
        }
      }.bind(this));
    } catch (e) {
      cb(undefined, {
        'errcode': 'CONNECTION_FAILED',
        'message': 'Chrome Connection Failed: ' + e.message
      });
    }
  }.bind(this));
};

/**
 * Secure an already connected socket.
 * @method secure
 * @param {Function} cb Function to call with completion or error.
 */
Socket_chrome.prototype.secure = function(cb) {
  if (!this.id) {
    cb(undefined, {
      'errcode': 'NOT_CONNECTED',
      'message': 'Cannot secure a disconnected socket'
    });
    return;
  } else if (!this.prepareSecureCalled) {
    cb(undefined, {
      'errcode': 'CONNECTION_FAILED',
      'message': 'prepareSecure not called before secure'
    });
    return;
  } else if (!chrome.sockets.tcp.secure) {
    cb(undefined, {
      'errcode': 'CONNECTION_FAILED',
      'message': 'Secure method not available'
    });
    return;
  }
  chrome.sockets.tcp.secure(this.id, {}, function(secureResult) {
    // Always unpause the socket, regardless of whether .secure succeeds.
    this.unpause().then(function() {
      if (secureResult !== 0) {
        cb(undefined, {
          'errcode': 'CONNECTION_FAILED',
          'message': 'Secure failed: ' + secureResult + ': ' +
              Socket_chrome.ERROR_MAP[secureResult]
        });
        return;
      }
      cb();
    }.bind(this), function(e) {
      cb(undefined, {
        'errcode': 'CONNECTION_FAILED',
        'message': 'Secure failed: error unpausing socket'
      });
    });
  }.bind(this));
};

/**
 * Prepares a socket for becoming secure after the next read event.
 * See details at
 * https://github.com/freedomjs/freedom/wiki/prepareSecure-API-Usage
 * @method prepareSecure
 * @param {Function} cb Function to call with completion or error.
 */
Socket_chrome.prototype.prepareSecure = function(cb) {
  if (!this.id) {
    cb(undefined, {
      'errcode': 'NOT_CONNECTED',
      'message': 'Cannot prepareSecure a disconnected socket'
    });
    return;
  }
  this.pause().then(
    function() {
      this.prepareSecureCalled = true;
      cb();
    }.bind(this), function(e) {
    cb(undefined, {
      'errcode': 'CONNECTION_FAILED',
      'message': 'prepareSecure failed: error pausing socket'
    });
  });
};

/**
 * Pauses the socket
 * @method pause
 * @private
 * @returns {Promise} Promise to be fulfilled on pause.
 */
Socket_chrome.prototype.pause = function() {
  if (!this.id) {
    return Promise.reject('Cannot pause disconnected socket');
  }
  return new Promise(function(fulfill, reject) {
    chrome.sockets.tcp.setPaused(this.id, true, fulfill);
  }.bind(this));
};

/**
 * Unpauses the socket
 * @method unpause
 * @private
 * @returns {Promise} Promise to be fulfilled on unpause.
 */
Socket_chrome.prototype.unpause = function() {
  if (!this.id) {
    return Promise.reject('Cannot unpause disconnected socket');
  }
  return new Promise(function(fulfill, reject) {
    chrome.sockets.tcp.setPaused(this.id, false, fulfill);
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
      'errcode': 'NOT_CONNECTED',
      'message': 'Cannot Write on Closed Socket'
    });
    return;
  }

  chrome.sockets.tcp.send(this.id, data, function(sendInfo) {
    if (sendInfo.resultCode < 0) {
      var errorObject = this.dispatchDisconnect(sendInfo.resultCode);
      return cb(undefined, {
        'errcode': errorObject['errcode'],
        'message': 'Send Error: ' + errorObject['message']
      });
    } else if (sendInfo.bytesSent !== data.byteLength) {
      this.dispatchDisconnect();
      return cb(undefined, {
        'errcode': 'UNKNOWN',
        'message': 'Write Partially completed.'
      });
    }
    cb();
  }.bind(this));
};


Socket_chrome.ERROR_MAP = {
  '0': 'SUCCESS',
  // Error codes are at:
  // https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
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
  '-107': 'SSL_PROTOCOL_ERROR',
  '-108': 'ADDRESS_INVALID',
  '-109': 'ADDRESS_UNREACHABLE',
  '-118': 'CONNECTION_TIMED_OUT',
  '-200': 'CERT_COMMON_NAME_INVALID',
   // See Cordova Plugin socket.js
  '-1000': 'GENERIC_CORDOVA_FAILURE'
};

// Map from names in the Chrome error map to corresponding Freedom error codes.
Socket_chrome.FREEDOM_ERROR_MAP = {
  'SUCCESS': 'SUCCESS',
  'INVALID_ARGUMENT': 'INVALID_ARGUMENT',
  'TIMED_OUT': 'TIMED_OUT',
  'NETWORK_CHANGED': 'NETWORK_CHANGED',
  'SOCKET_NOT_CONNECTED': 'NOT_CONNECTED',
  'CONNECTION_CLOSED': 'CONNECTION_CLOSED',
  'CONNECTION_RESET': 'CONNECTION_RESET',
  'CONNECTION_REFUSED': 'CONNECTION_REFUSED',
  'CONNECTION_FAILED': 'CONNECTION_FAILED',
  'NAME_NOT_RESOLVED': 'CONNECTION_FAILED',
  'INTERNET_DISCONNECTED': 'INTERNET_DISCONNECTED',
  'ADDRESS_INVALID': 'ADDRESS_INVALID',
  'ADDRESS_UNREACHABLE': 'ADDRESS_UNREACHABLE',
  'CONNECTION_TIMED_OUT': 'TIMED_OUT',
  'UNKNOWN': 'UNKNOWN'
};

/**
 * Get the Chrome error string associated with a chrome.socket error code.
 * @method errorStringOfCode
 * @static
 * @private
 * @param {Number=} code The error number as described by chrome
 * @returns {String} The error code as defined in the freedom.js interface.
 */
Socket_chrome.errorStringOfCode = function(code) {
  return Socket_chrome.ERROR_MAP[String(code)] ||
      'UNKNOWN';
};

/**
 * Get the Freedom error code associated with a Chrome error string
 * @method freedomErrorCode
 * @static
 * @private
 * @param {String=} errorString The Chrome error string
 * @return {String} The corresponding Freedom error string (often identical).
 */
Socket_chrome.freedomErrorCode = function(errorString) {
  return Socket_chrome.FREEDOM_ERROR_MAP[errorString] || 'UNKNOWN';
};

/*
 * Alert a consumer that a socket is disconnected, with appropriate
 * error message.
 * @method dispatchDisconnect
 * @private
 * @param {Number=} code the code returned by chrome when the socket closed.
 * @return {{errorcode: string, message: string}} Error JSON object.
 */
Socket_chrome.prototype.dispatchDisconnect = function (code) {
  var errorString = Socket_chrome.errorStringOfCode(code);
  var freedomErrorCode = Socket_chrome.freedomErrorCode(errorString);
  /** @type {string} */ var errorMessage;
  if (freedomErrorCode === 'SUCCESS') {
    errorMessage = 'Socket closed by call to close';
  } else if(freedomErrorCode === 'CONNECTION_CLOSED') {
    errorMessage = 'Connection closed gracefully';
  } else {
    errorMessage = 'Socket Error: ' + code + ': ' + errorString;
  }

  var errorObject = {
    'errorcode': freedomErrorCode,
    'message': errorMessage
  };

  // Don't send more than one dispatchDisconnect event.
  if (this.id) {
    Socket_chrome.removeActive(this.id);
    delete this.id;

    this.dispatchEvent('onDisconnect', errorObject);
  }

  return errorObject;
};

/**
 * Generates an index key for {@Socket_chrome.active}.
 * The key is a string with the format 'type.id', where type is 'client' if
 * this is a client socket or 'server' if this is a server socket and id is
 * the socket ID.
 * @method keyForActive
 * @private
 * @param {Object} namespace Socket namespace, indicating client or server socket.
 * @param {number} id The socketId, as provided by chrome.sockets.
 * @static
 * @see Socket_chrome.active
 */
Socket_chrome.keyForActive = function(namespace, id) {
  return (namespace === chrome.sockets.tcp ? 'client' : 'socket') + '.' + id;
};

/**
 * Mark a socket as active, so that dispatched events can be routed to it.
 * This method is needed because chrome.sockets exposes a single event handler
 * for incoming data across all sockets.
 * @method addActive
 * @static
 * @param {Socket_chrome} socket The socket class associated with the id.
 */
Socket_chrome.addActive = function(socket) {
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
  Socket_chrome.active[Socket_chrome.keyForActive(
      socket.namespace, socket.id)] = socket;
};

/**
 * Unmark a socket as active, and clean up event handlers if needed.
 * @method removeActive
 * @static
 * @param {Socket_chrome} socket The socket class associated with the id.
 */
Socket_chrome.removeActive = function(socket) {
  delete Socket_chrome.active[Socket_chrome.keyForActive(
      socket.namespace, socket.id)];
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
  var key = Socket_chrome.keyForActive(chrome.sockets.tcp, readInfo.socketId);
  if (!(key in Socket_chrome.active)) {
    console.warn('Dropped Read: ', readInfo);
    return;
  }
  Socket_chrome.active[key].dispatchEvent('onData', {data: readInfo.data});
};

/**
 * React to read errors.
 * @method handleReadError
 * @private
 * @param {readInfo} readInfo The value returned by onReceiveError.
 * @static
 */
Socket_chrome.handleReadError = function (readInfo) {
  var key = Socket_chrome.keyForActive(chrome.sockets.tcp, readInfo.socketId);
  if (!(key in Socket_chrome.active)) {
    console.warn('Dropped Read Error: ', readInfo);
    return;
  }
  Socket_chrome.active[key].dispatchDisconnect(readInfo.resultCode);
};

/**
 * React to client accepts.
 * @method handleAccept
 * @private
 * @param {acceptInfo} acceptInfo The value returned by onAccept.
 * @static
 */
Socket_chrome.handleAccept = function (acceptInfo) {
  var key = Socket_chrome.keyForActive(chrome.sockets.tcpServer,
      acceptInfo.socketId);
  if (!(key in Socket_chrome.active)) {
    console.warn('Dropped Accept: ', acceptInfo);
    return;
  }

  chrome.sockets.tcp.getInfo(acceptInfo.clientSocketId, function(info) {
    Socket_chrome.active[key].dispatchEvent('onConnection', {
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
 * @param {acceptInfo} acceptInfo The value returned by onAcceptError.
 * @static
 */
Socket_chrome.handleAcceptError = function (acceptInfo) {
  var key = Socket_chrome.keyForActive(chrome.sockets.tcpServer,
      acceptInfo.socketId);
  if (!(key in Socket_chrome.active)) {
    console.warn('Dropped Accept Error: ', info);
    return;
  }

  Socket_chrome.active[key].dispatchDisconnect(acceptInfo.resultCode);
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
      errcode: 'ALREADY_CONNECTED',
      message: 'Cannot Listen on existing socket.'
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
      errorMsg = 'Chrome Listen failed: ' + Socket_chrome.ERROR_MAP[result];
    } else {
      errorMsg = 'Chrome Listen failed: Unknown code ' + result;
    }
    callbackFromListen(undefined, {
      errcode: 'CONNECTION_FAILURE',
      message: errorMsg
    });
    return;
  }

  callbackFromListen();
  Socket_chrome.addActive(this);
};

/**
 * Close and Destroy a socket
 * @method close
 * @param {Function} continuation Function to call once socket is destroyed.
 */
Socket_chrome.prototype.close = function(continuation) {
  if (this.id) {
    // Note: this.namespace used, since this method is common to tcp and
    // tcpServer sockets.
    this.namespace.close(this.id, function() {
      this.dispatchDisconnect(0);
      continuation();
    }.bind(this));
  } else {
    continuation(undefined, {
      'errcode': 'SOCKET_CLOSED',
      'message': 'Socket Already Closed, or was never opened'
    });
  }
};

/** REGISTER PROVIDER **/
exports.provider = Socket_chrome;
exports.name = 'core.tcpsocket';
