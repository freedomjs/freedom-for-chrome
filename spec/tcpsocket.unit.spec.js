var tcpsock = require('../providers/tcpsocket');
// White-box test for the Chrome APIs implementation of
// Freedom's TCP socket provider.
// Modeled on Freedom's social.loopback.unit.spec.js.
describe("tcpsocket", function() {
  var provider;
  // Supplied as an argument to the mock chrome.socket.create callback.
  var createResult;
  // Supplied as an argument to the mock chrome.socket.connect callback.
  var connResult;
  // Supplied as an argument to the mock chrome.socket.send callback.
  var sendResult;
  // Supplied as an argument to the mock chrome.socket.getInfo callback.
  var getInfoResult;
  var continuation = jasmine.createSpy('continuation');

  beforeEach(function() {
    chrome = {
      sockets: {
        tcp: {
          create: function(args, callback) {
            callback(createResult);
          },
          connect: function(socketId, address, port, callback) {
            callback(connResult);
          },
          send: function(socketId, data, callback) {
            callback(sendResult);
          },
          getInfo: function(socketId, callback) {
            callback(getInfoResult);
          },
          onReceive: {
            removeListener: function() {}
          },
          onReceiveError: {
            removeListener: function() {}
          }
        }
      }
    };

    spyOn(chrome.sockets.tcp, 'create').and.callThrough();
    spyOn(chrome.sockets.tcp, 'connect').and.callThrough();
    spyOn(chrome.sockets.tcp, 'send').and.callThrough();
    spyOn(chrome.sockets.tcp, 'getInfo').and.callThrough();

    provider = new tcpsock.provider(
        jasmine.createSpy('channel'),
        jasmine.createSpy('dispatchEvent'));
});

  it('connects', function() {
    createResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    provider.connect('localhost', 5000, continuation);
    expect(chrome.sockets.tcp.create).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.any(Function));
    expect(chrome.sockets.tcp.connect).toHaveBeenCalledWith(
        createResult.socketId,
        'localhost',
        5000,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalled();
  });

  it('getInfo', function() {
    createResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    getInfoResult = {
      localAddress: 'localhost',
      localPort: '9999'
    };
    provider.connect('localhost', 5000, continuation);
    provider.getInfo(continuation);
    expect(chrome.sockets.tcp.getInfo).toHaveBeenCalledWith(
        createResult.socketId,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(getInfoResult);
  });

  it('writes', function() {
    createResult = { socketId: 1025 };
    connResult = -1, // failure! don't want an infinite loop.
    sendResult = {
      bytesSent: 4
    };
    provider.connect('localhost', 5000, continuation);
    provider.write(new ArrayBuffer(), continuation);
    expect(chrome.sockets.tcp.send).toHaveBeenCalledWith(
        createResult.socketId,
        new ArrayBuffer(),
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(undefined, jasmine.any(Object));
  });
});
