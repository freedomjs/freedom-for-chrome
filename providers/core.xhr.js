/*jshint node:true*/
/*global */

  function debuffer(obj, arrayPaths, path) {
    if (!path) {
      path = [];
    }
    if (typeof obj !== 'object') {
      return;
    }
    for (var key in obj) {
      var nextPath = path.concat(key);
      if (obj[key] instanceof ArrayBuffer) {
        var buffer = obj[key];
        var view = new Uint8Array(buffer);
        obj[key] = view.join(',');
        arrayPaths.push(nextPath);
      } else {
        debuffer(obj[key], arrayPaths, nextPath);
      }
    }
  }

  function rebuffer(obj, arrayPaths) {
    arrayPaths.forEach(function(path) {
      var subObj = obj;
      for (var i = 0; i < path.length - 1; ++i) {
        subObj = subObj[path[i]];
      }
      var lastKey = path[path.length - 1];
      var value = subObj[lastKey];
      var view = new Uint8Array(value.split(','));
      subObj[lastKey] = view.buffer;
    });
  }

var innerScript = function(portName) {
  console.log('innerScript(' + portName + ')');
  function debuffer(obj, arrayPaths, path) {
    if (!path) {
      path = [];
    }
    if (typeof obj !== 'object') {
      return;
    }
    for (var key in obj) {
      var nextPath = path.concat(key);
      if (obj[key] instanceof ArrayBuffer) {
        var buffer = obj[key];
        var view = new Uint8Array(buffer);
        obj[key] = view.join(',');
        arrayPaths.push(nextPath);
      } else {
        debuffer(obj[key], arrayPaths, nextPath);
      }
    }
  }

  function rebuffer(obj, arrayPaths) {
    arrayPaths.forEach(function(path) {
      var subObj = obj;
      for (var i = 0; i < path.length - 1; ++i) {
        subObj = subObj[path[i]];
      }
      var lastKey = path[path.length - 1];
      var value = subObj[lastKey];
      var view = new Uint8Array(value.split(','));
      subObj[lastKey] = view.buffer;
    });
  }

  var XhrInner = function() {
    console.log('Constructing');
    // no extensionId means self-connect to this extension/app.
    var connectOptions = {name: portName};
    try {
      this._port = chrome.runtime.connect(connectOptions);
    } catch (e) {
      console.log('connect failed: ' + e);
    }
    this._port.onMessage.addListener(this._onMessage.bind(this));
    this._xhr = new XMLHttpRequest();

    this._events = [
      "loadstart",
      "progress",
      "abort",
      "error",
      "load",
      "timeout",
      "loadend",
      "readystatechange"
    ];
    this._setupListeners();
  };

  XhrInner.prototype._onMessage = function(callMsg) {
    rebuffer(callMsg.obj, callMsg.paths);
    callMsg = callMsg.obj;
    try {
      console.log('Calling ' + callMsg.method + '(' + callMsg.args.join(', ') + ')');
      this[callMsg.method].apply(this, callMsg.args).then(
          this._resolve.bind(this, callMsg),
          this._reject.bind(this, callMsg));
    } catch (e) {
      console.log('Exception! ' + e);
      this._reject(callMsg, e);
    }
  };

  XhrInner.prototype._postMessage = function(msg) {
    var paths = [];
    debuffer(msg, paths);
    this._port.postMessage({
      obj: msg,
      paths: paths
    });
  };

  XhrInner.prototype._resolve = function(callMsg, returnValue) {
    console.log(callMsg.method + '(' + callMsg.args.join(', ') + ') returned ' + returnValue);
    this._postMessage({
      callId: callMsg.callId,
      returnValue: returnValue
    });
  };

  XhrInner.prototype._reject = function(callMsg, error) {
    console.log('Rejecting: ' + error);
    this._postMessage({
      callId: callMsg.callId,
      error: error
    });
  };

  XhrInner.prototype._dispatchEvent = function(eventName, data) {
    var eventData = JSON.stringify(data);
    console.log('dispatchEvent(' + eventName + ', ' + eventData + ')');
    this._postMessage({
      eventName: eventName,
      eventData: eventData
    });
  };

  XhrInner.prototype._polyfillProgressEvent = function(eventName, event) {
    // ProgressEvents are missing all their attributes!  We fill in as best we
    // can.  TODO: Only do this if the provided event is broken.
    event = {};  // Modifying the broken ProgressEvent doesn't work!
    event.type = eventName;
    event.loaded = 0;
    var response = this._xhr.response;
    if (response) {
      var responseType = this._xhr.responseType;
      if (responseType === "" || responseType === "text") {
        event.loaded = response.length;
      } else if (responseType === "arraybuffer") {
        event.loaded = response.byteLength;
      } else if (responseType === "blob") {
        event.loaded = response.size;
      } else if (responseType === "json") {
        event.loaded = JSON.stringify(response).length;
      }
    }
    
    if (this._xhr.readyState === 4) {  // DONE
      event.lengthComputable = true;
      event.total = event.loaded;
    } else {
      event.lengthComputable = false;
      event.total = 0;
    }
    return event;
  };

  XhrInner.prototype._setupListeners = function() {
    // Download events
    this._events.forEach(function (eventName) {
      this._xhr.addEventListener(eventName, function(eventName, event) {
        if (eventName !== "readystatechange") {
          event = this._polyfillProgressEvent(eventName, event);
        }
        this._dispatchEvent("on" + eventName, event);
      }.bind(this, eventName), false);
    }.bind(this));

    // Upload events
    this._events.forEach(function (eventName) {
      this._xhr.upload.addEventListener(eventName, function(eventName, event) {
        if (eventName !== "readystatechange") {
          event = this._polyfillProgressEvent(event);
        }
        this._dispatchEvent("onupload" + eventName, event);
      }.bind(this, eventName), false);
    }.bind(this));
  };

  XhrInner.prototype.open = function(method, url, async, user, password) {
    if (typeof async !== "undefined" && async !== true) {
      return Promise.reject({
        errcode: "InvalidAccessError",
        message: "async should always be set to true"
      });
    }

    // Force async to be true. undefined can lead to async=false in Chrome packaged apps
    this._xhr.open(method, url, true, user, password);
    return Promise.resolve();
  };

  XhrInner.prototype.send = function(data) {
    if (!(data instanceof Object)) {
      this._xhr.send();
    } else if (data.hasOwnProperty("string")) {
      this._xhr.send(data.string);
    } else if (data.hasOwnProperty("buffer")) {
      this._xhr.send(data.buffer);
    } else {
      this._xhr.send();
    }
    return Promise.resolve();
  };

  XhrInner.prototype.abort = function() {
    this._xhr.abort();
    return Promise.resolve();
  };

  XhrInner.prototype.getResponseHeader = function(header) {
    return Promise.resolve(this._xhr.getResponseHeader(header));
  };

  XhrInner.prototype.getAllResponseHeaders = function() {
    return Promise.resolve(this._xhr.getAllResponseHeaders());
  };

  XhrInner.prototype.setRequestHeader = function(header, value) {
    this._xhr.setRequestHeader(header, value);
    return Promise.resolve();
  };

  XhrInner.prototype.overrideMimeType = function(mime) {
    this._xhr.overrideMimeType(mime);
    return Promise.resolve();
  };

  XhrInner.prototype.getReadyState = function() {
    return Promise.resolve(this._xhr.readyState);
  };

  XhrInner.prototype.getResponse = function() {
    if (this._xhr.response === null) {
      return Promise.resolve(null);
    } else if (this._xhr.responseType === "text" || this._xhr.responseType === "") {
      return Promise.resolve({ string: this._xhr.response });
    } else if (this._xhr.responseType === "arraybuffer") {
      return Promise.resolve({ buffer: this._xhr.response });
    } else if (this._xhr.responseType === "json") {
      return Promise.resolve({ object: this._xhr.response });
    }

    return Promise.reject("core.xhr cannot determine type of response");
  };

  XhrInner.prototype.getResponseText = function() {
    return Promise.resolve(this._xhr.responseText);
  };

  XhrInner.prototype.getResponseURL = function() {
    return Promise.resolve(this._xhr.responseURL);
  };

  XhrInner.prototype.getResponseType = function() {
    return Promise.resolve(this._xhr.responseType);
  };

  XhrInner.prototype.setResponseType = function(type) {
    this._xhr.responseType = type;
    return Promise.resolve();
  };

  XhrInner.prototype.getStatus = function() {
    return Promise.resolve(this._xhr.status);
  };

  XhrInner.prototype.getStatusText = function() {
    return Promise.resolve(this._xhr.statusText);
  };

  XhrInner.prototype.getTimeout = function() {
    return Promise.resolve(this._xhr.timeout);
  };

  XhrInner.prototype.setTimeout = function(timeout) {
    this._xhr.timeout = timeout;
    return Promise.resolve();
  };

  XhrInner.prototype.getWithCredentials = function() {
    return Promise.resolve(this._xhr.withCredentials);
  };

  XhrInner.prototype.setWithCredentials = function(wc) {
    this._xhr.withCredentials = wc;
    return Promise.resolve();
  };

  window._xhrInner = new XhrInner();  // Superstitious, to prevent GC.
};

// Ensure that each XhrProvider gets the right Webview, if there are multiple
// XhrProviders created in quick succession.
var idCounter = 0;
function getWebviewName() {
  ++idCounter;
  return "XHR inner " + idCounter;
}

function startWebview(name) {
  console.log('Starting new webview for ' + name);
  // Construct a function call string
  var startString = "(" + innerScript.toString() + ")('" + name + "')";
  var webview = window.document.createElement("webview");
  webview.addEventListener('consolemessage', function(e) {
    console.log('Webview for ' + name + ' says: ' + e.message);
  });
  webview.addEventListener('contentload', function() {
    console.log('contentload fired for ' + name);
    webview.executeScript({code: startString});
  });
  webview.src = "about:blank";
  webview.style.display = "none";
  window.document.body.appendChild(webview);
  return webview;
}

function cleanupWebview(webview) {
  webview.terminate();
  window.document.body.removeChild(webview);
}

var XhrProvider = function(cap, dispatchEvent) {
  var name = getWebviewName();
  this._id = idCounter;
  this._log('Constructing');
  this._dispatchEvent = dispatchEvent;

  this._callCounter = 0;
  this._outstandingCalls = {};

  this._portPromise = new Promise(function(F, R) {
    this._havePort = F;
  }.bind(this));
  var onConnectShim = function(port) {
    this._log('onConnectShim: port.name is ' + port.name);
    if (port.name === name) {
      chrome.runtime.onConnect.removeListener(onConnectShim);
      this._onConnect(port);
    }
  }.bind(this);
  chrome.runtime.onConnect.addListener(onConnectShim);

  this._webview = startWebview(name);

  // All methods except setRequestHeader, which is handled specially.
  var methods = [
    "open",
    "send",
    "abort",
    "getResponseHeader",
    "getAllResponseHeaders",
    "overrideMimeType",
    "getReadyState",
    "getResponse",
    "getResponseText",
    "getResponseURL",
    "getResponseType",
    "setResponseType",
    "getStatus",
    "getStatusText",
    "getTimeout",
    "setTimeout",
    "getWithCredentials",
    "setWithCredentials"
  ];
  methods.forEach(this._addMethod.bind(this));

  setTimeout(cap.provider.onClose.bind(
    cap.provider,
    this,
    this._onClose.bind(this)
  ), 0);
};

XhrProvider.prototype._log = function(msg) {
  console.log('XhrProvider ' + this._id + ': ' + msg);
};

XhrProvider.prototype._onConnect = function(port) {
  if (this._port) {
    this._log('Duplicate port');
    return;
  }
  this._log('Connected!');
  this._port = port;
  this._port.onMessage.addListener(this._onMessage.bind(this));
  this._havePort(port);
};

XhrProvider.prototype._onMessage = function(msg) {
  if (msg) {
    rebuffer(msg.obj, msg.paths);
    msg = msg.obj;
  }

  if (msg && msg.eventName) {
    this._log('dispatchEvent(' + msg.eventName + ', ' + msg.eventData + ')');
    this._dispatchEvent(msg.eventName, JSON.parse(msg.eventData));
  } else if (msg && msg.callId in this._outstandingCalls) {
    var completion = this._outstandingCalls[msg.callId];
    if (msg.error) {
      this._log('rejecting with ' + JSON.stringify(msg.error));
      completion.reject(msg.error);
    } else {
      this._log('resolving with ' + JSON.stringify(msg.returnValue));
      completion.resolve(msg.returnValue);
    }
    delete this._outstandingCalls[msg.callId];
  } else {
    throw new Error("Incomprehensible message: " + JSON.stringify(msg));
  }
};

XhrProvider.prototype._addMethod = function(name) {
  this[name] = function() {
    // Elementwise copy recommended by V8 team:
    // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
    var argsArray = [];
    for (var i = 0; i < arguments.length; ++i) {
      argsArray[i] = arguments[i];
    }
    return this._forward(name, argsArray);
  }.bind(this);
};

XhrProvider.prototype._postMessage = function(msg) {
  var paths = [];
  debuffer(msg, paths);
  this._portPromise.then(function(port) {
    port.postMessage({
      obj: msg,
      paths: paths
    });
  });
};

XhrProvider.prototype._forward = function(methodName, argsArray) {
  this._log('forwarding ' + methodName + '(' + argsArray.join(', ') + ')');
  var completion = {};
  var promise = new Promise(function(F, R) {
    completion.resolve = F;
    completion.reject = R;
  });
  var callId = ++this._callCounter;
  this._outstandingCalls[callId] = completion;
  this._postMessage({
    callId: callId,
    method: methodName,
    args: argsArray
  });
  return promise;
};

XhrProvider.prototype._onClose = function() {
  // Dispose of things that might not free automatically with GC.
  cleanupWebview(this._webview);
  this._portPromise.then(function(port) { port.disconnect(); });
};

XhrProvider.prototype.setRequestHeader = function(header, value) {
  this._log('setRequestHeader(' + header + ', ' + value + ')');
  var setHeader = function(details) {
    details.requestHeaders.push({
      name: header,
      value: value
    });
    this._log('setRequestHeader action: ' + JSON.stringify(details.requestHeaders));
    return {requestHeaders: details.requestHeaders};
  };
  this._webview.request.onBeforeSendHeaders.addListener(setHeader, {
    urls: ["<all_urls>"]
  }, ["requestHeaders", "blocking"]);
};

exports.name = "core.xhr";
exports.provider = XhrProvider;
exports.style = "providePromises";
exports.flags = { provider: true };
