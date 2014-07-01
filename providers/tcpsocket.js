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
  if (this.id) {
    this.startReadLoop();
  }
};

/**
 * Get Information about the socket.
 * @method getInfo
 * @return {Object} connection and address information about the socket.
 */
Socket_chrome.prototype.getInfo = function(continuation) {
  if (this.id) {
    chrome.socket.getInfo(this.id, continuation);
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
  chrome.socket.create('tcp', {}, function(createInfo) {
    this.id = createInfo.socketId;
    chrome.socket.connect(this.id, hostname, port, function (result) {
      if (result < 0) {
        cb(undefined, {
          "errcode": "CONNECTION_FAILED",
          "message": "Chrome Connection Failed: " +
              Socket_chrome.ERROR_MAP[result]
        });
      } else {
        cb();
      }
      this.startReadLoop();
    }.bind(this));
  }.bind(this));
};

Socket_chrome.prototype.write = function(data, cb) {
  if (!this.id) {
    cb(undefined, {
      "errcode": "SOCKET_CLOSED",
      "message": "Cannot Write on Closed Socket"
    });
    return;
  }
  chrome.socket.write(this.id, data, cb);
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
 * @param {Nuber} code the code returned by chrome when the socket closed.
 */
Socket_chrome.prototype.dispatchDisconnect = function (code) {
  if (code === 0) {
    this.dispatchEvent('onDisconnect', {
      errcode: 'NONE',
      message: 'closed by us'
    });
  } else if(code === -100) {
    this.dispatchEvent('onDisconnect', {
      errcode: 'NONE',
      message: 'closed by remote'
    });
  } else {
    this.dispatchEvent('onDisconnect', {
      errcode: Socket_chrome.errorStringOfCode(code),
      message: 'unexpected socket error: ' + code
    });
  }
};

Socket_chrome.prototype.handleReadData = function (readInfo) {
  if(readInfo.resultCode <= 0) {
    this.dispatchDisconnect(readInfo.resultCode);
    throw new Error("Disconnected");
  }
  this.dispatchEvent('onData', {data: readInfo.data});
};

/*
 * Read data on a socket in an event loop until the socket is closed or an
 * error occurs.
 * @method startReadLoop
 * @private
 */
Socket_chrome.prototype.startReadLoop = function() {
  var loop = function() {
    return this.makeSocketReadPromise()
      .then(this.handleReadData.bind(this))
      .then(loop);
  }.bind(this);
  loop();
};

/**
 * Return a promise based on a chrome.read call.
 * @method doRead
 * @private
 */
Socket_chrome.prototype.makeSocketReadPromise = function() {
  return new Promise(function(resolve) {
    chrome.socket.read(this.id, null, resolve);
  }.bind(this));
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
  chrome.socket.create('tcp', {}, function(createInfo) {
    this.id = createInfo.socketId;
    // See https://developer.chrome.com/apps/socket#method-listen
    chrome.socket.listen(this.id, address, port,
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
  chrome.socket.accept(this.id, this.acceptLoop.bind(this));
};

/**
 * Callback of a call to |chrome.socket.accept|.
 * @method acceptLoop_
 * @param {Object} acceptInfo has socketId as parameter that is a number
 * representing an internal socket id.
 * @private
 */
Socket_chrome.prototype.acceptLoop = function(acceptInfo) {
  // If this socket has not been closed, keep accepting more socket connections.
  if (this.id) {
    chrome.socket.accept(this.id, this.acceptLoop.bind(this));
  }

  // handle errors as warnings.
  if (acceptInfo.resultCode !== 0) {
    console.warn('Failed to accept ' + this.id + ': ' +
        acceptInfo.resultCode);
    return;
  }

  // Dispatch the appropriate event to the parent module.
  chrome.socket.getInfo(acceptInfo.socketId, function(info) {
    this.dispatchEvent('onConnection', {
      socket: acceptInfo.socketId,
      host: info.peerAddress,
      port: info.peerPort
    });
  }.bind(this));
};

/**
 * Close and Destroy a socket
 * @method close
 * @param {Function} continuation Function to call once socket is destroyed.
 */
Socket_chrome.prototype.close = function(continuation) {
  if (this.id) {
    chrome.socket.disconnect(this.id);
    chrome.socket.destroy(this.id);
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
