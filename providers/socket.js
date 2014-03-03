/*globals chrome,fdom:true,console*/
/*jslint indent:2,white:true,sloppy:true */
/**
 * A freedom.js interface to Chrome sockets
 * @constructor
 * @private
 * @param {fdom.Port} channel the module creating this provider.
 * @param {Function} dispatchEvent Method for emitting events.
 */
var Socket_chrome = function(channel, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;

  // http://developer.chrome.com/apps/socket.html
  this.create = chrome.socket.create;
  this.write = chrome.socket.write;
  this.getInfo = chrome.socket.getInfo;
};

/**
 * Connect to a designated location and begin reading.
 * @method connect
 * @param {number} socketId The socket to connect.
 * @param {String} hostname The host or ip to connect to.
 * @param {number} port The port to connect on.
 * @param {Function} cb Function to call with completion or error.
 */
Socket_chrome.prototype.connect = function(socketId, hostname, port, cb) {
  chrome.socket.connect(socketId, hostname, port, function (result) {
    cb(result);
    this.read(socketId);
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
  '-106': 'INTERNET_DISCONNECTED'
};

/*
 * Read data on a socket in an event loop until the socket is closed or an
 * error occurs.
 * @method read
 * @private
 * @param {number} socketId The socket to read on.
 */
Socket_chrome.prototype.read = function(socketId) {
  var loop;
  loop = function(socketId) {
    return this.doRead(socketId)
    .then(this.checkReadResult.bind(this))
    .then(function(data) {
      this.dispatchEvent('onData', {
        socketId: socketId,
        data: data
      }.bind(this));
    })
    .then(loop);
  }.bind(this, socketId);
  
  loop().catch(function(socketId, err) {
    console.warn('Read Error [' + socketId + ']: ' + err.message);
    this.dispatchEvent('onDisconnect', {
      socketId: socketId,
      error: err.message
    }.bind(this, socketId));
  });
};

/**
 * Return a promise based on a chrome.read call.
 * @method doRead
 * @private
 * @param {number} socketId The socket to read on.
 */
Socket_chrome.prototype.doRead = function(socketId) {
  return new Promise(function(resolve) {
    chrome.socket.read(socketId, null, resolve);
  });
};

/**
 * Check the result code of a read - if non-positive, reject
 * the promise, otherwise pass along.
 * @method checkReadResult
 * @private
 * @param {ChromeReadInfo} readInfo The result of a chrome.socket.read call
 */
Socket_chrome.prototype.checkReadResult = function(readInfo) {
  var code = readInfo.resultCode;
  if (code === 0) {
    return Promise.reject(new Error('remotely closed.'));
  } else if (code < 0) {
    return Promise.reject(new Error(Socket_chrome.ERROR_MAP['' + code] ||
        code));
  } else {
    return Promise.resolve(readInfo.data);
  }
};

/**
 * Listen on a socket to accept new clients.
 * @method listen
 * @param {number} socketId the socket to Listen on
 * @param {String} address the address to listen on
 * @param {number} port the port to listen on
 * @param {Function} callback Callback to call when listening has occured.
 */
Socket_chrome.prototype.listen = function(socketId, address, port, callback) {
  chrome.socket.listen(socketId, address, port, null, function(sid, result) {
    var acceptCallback;

    callback(result);
    if (result !== 0) {
      return;
    }
    
    // Begin accepting on the listening socket.
    acceptCallback = function(sid, acceptInfo) {
      if (acceptInfo.resultCode === 0) {
        this.dispatchEvent('onConnection', {
          serverSocketId: sid,
          clientSocketId: acceptInfo.socketId
        });
        chrome.socket.accept(sid, acceptCallback);
        this.read(sid);
      // -15 is socket_not_connected.
      } else if (acceptInfo.resultCode !== -15) {
        console.warn('Failed to accept on ' + sid + ': ' +
            acceptInfo.resultCode);
      }
    }.bind(this, sid);

    chrome.socket.accept(sid, acceptCallback);
  }.bind(this, socketId));
};

/**
 * Destroy a socket
 * @method destroy
 * @param {number} socketId The socket to destroy.
 * @param {Function} continuation Function to call once socket is destroyed.
 */
Socket_chrome.prototype.destroy = function(socketId, continuation) {
  chrome.socket.destroy(socketId);
  continuation();
};

/**
 * Disconnect a socket
 * @method disconnect
 * @param {number} socketId The socket to disconnect
 * @param {Function} continuation Function to call once socket is disconnected.
 */
Socket_chrome.prototype.disconnect = function(socketId, continuation) {
  chrome.socket.disconnect(socketId);
  continuation();
};

/** REGISTER PROVIDER **/
if (typeof fdom !== 'undefined') {
  fdom.apis.register("core.socket", Socket_chrome);
}
