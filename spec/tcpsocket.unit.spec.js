var tcpsock = require('../providers/core.tcpsocket');
// White-box test for the Chrome APIs implementation of
// Freedom's TCP socket provider.
// Modeled on Freedom's social.loopback.unit.spec.js.
describe("tcpsocket", function() {
  var provider;
  // Supplied as an argument to the mock chrome.sockets.tcp.create callback.
  var createClientResult;
  // Supplied as an argument to the mock chrome.sockets.tcp.connect callback.
  var connResult;
  // Supplied as an argument to the mock chrome.sockets.tcp.send callback.
  var sendResult;
  // Supplied as an argument to the mock chrome.sockets.tcp.getInfo callback.
  var getClientInfoResult;

  // Supplied as an argument to the mock chrome.sockets.tcpServer.create callback.
  var createServerResult;
  // Supplied as an argument to the mock chrome.sockets.tcpServer.listen callback.
  var listenResult;

  var continuation = jasmine.createSpy('continuation');

  beforeEach(function() {
    chrome = {
      sockets: {
        tcp: {
          create: function(args, callback) {
            callback(createClientResult);
          },
          connect: function(socketId, address, port, callback) {
            callback(connResult);
          },
          send: function(socketId, data, callback) {
            callback(sendResult);
          },
          getInfo: function(socketId, callback) {
            callback(getClientInfoResult);
          },
          onReceive: {
            addListener: function() {},
            removeListener: function() {}
          },
          onReceiveError: {
            addListener: function() {},
            removeListener: function() {}
          }
        },
        tcpServer: {
          create: function(args, callback) {
            callback(createServerResult);
          },
          listen: function(socketId, address, port, backlog, callback) {
            callback(listenResult);
          },
          onAccept: {
            addListener: function() {},
            removeListener: function() {}
          },
          onAcceptError: {
            addListener: function() {},
            removeListener: function() {}
          }
        }
      },
      runtime: {
        lastError: undefined
      }
    };

    spyOn(chrome.sockets.tcp, 'create').and.callThrough();
    spyOn(chrome.sockets.tcp, 'connect').and.callThrough();
    spyOn(chrome.sockets.tcp, 'send').and.callThrough();
    spyOn(chrome.sockets.tcp, 'getInfo').and.callThrough();

    spyOn(chrome.sockets.tcpServer, 'create').and.callThrough();
    spyOn(chrome.sockets.tcpServer, 'listen').and.callThrough();

    tcpsock.provider.active = {};
    provider = new tcpsock.provider(
        jasmine.createSpy('channel'),
        jasmine.createSpy('dispatchEvent'));
});

  it('connects', function() {
    createClientResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    provider.connect('localhost', 5000, continuation);
    expect(chrome.sockets.tcp.create).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.any(Function));
    expect(chrome.sockets.tcp.connect).toHaveBeenCalledWith(
        createClientResult.socketId,
        'localhost',
        5000,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalled();
  });

  it('getInfo', function() {
    createClientResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    getClientInfoResult = {
      localAddress: 'localhost',
      localPort: '9999'
    };
    provider.connect('localhost', 5000, continuation);
    provider.getInfo(continuation);
    expect(chrome.sockets.tcp.getInfo).toHaveBeenCalledWith(
        createClientResult.socketId,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(getClientInfoResult);
  });

  it('writes', function() {
    createClientResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    sendResult = {
      bytesSent: 4
    };
    provider.connect('localhost', 5000, continuation);
    provider.write(new ArrayBuffer(), continuation);
    expect(chrome.sockets.tcp.send).toHaveBeenCalledWith(
        createClientResult.socketId,
        new ArrayBuffer(),
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(undefined, jasmine.any(Object));
  });

  it('listens', function() {
    createServerResult = { socketId: 2048 };
    provider.listen('127.0.0.1', 5000, continuation);
    expect(chrome.sockets.tcpServer.create).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.any(Function));
    expect(chrome.sockets.tcpServer.listen).toHaveBeenCalledWith(
        createServerResult.socketId,
        '127.0.0.1',
        5000,
        100,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalled();
  });

  it('distinguishes client and server socket ids', function() {
    createServerResult = { socketId: 1 };
    listenResult = 0; // success!
    provider.listen('127.0.0.1', 5000, continuation);

    var otherProvider = new tcpsock.provider(
        jasmine.createSpy('other channel'),
        jasmine.createSpy('other dispatchEvent'));

    createClientResult = { socketId: 1 };
    connResult = 0, // success!
    otherProvider.connect('localhost', 5000, continuation);

    expect(Object.keys(tcpsock.provider.active).length).toEqual(2);
  });
});
