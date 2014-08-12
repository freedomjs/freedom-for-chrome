// White-box test for the Chrome APIs implementation of
// Freedom's UDP socket provider.
// Modeled on Freedom's social.loopback.unit.spec.js.
describe("udpsocket", function() {
  var provider;
  // Supplied as an argument to the mock chrome.socket.create callback.
  var createResult;
  // Supplied as an argument to the mock chrome.socket.bind callback.
  var bindResult;
  // Supplied as an argument to the mock chrome.socket.sendTo callback.
  var sendResult;
  // Supplied as an argument to the mock chrome.socket.getInfo callback.
  var getInfoResult;
  var continuation = jasmine.createSpy('continuation');

  beforeEach(function() {
    provider = new UdpSocket_chrome(
        jasmine.createSpy('channel'),
        jasmine.createSpy('dispatchEvent'));

    chrome = {
      sockets: {
        udp: {
          create: function(args, callback) {
            callback(createResult);
          },
          bind: function(socketId, address, port, callback) {
            callback(bindResult);
          },
          send: function(socketId, data, address, port, callback) {
            callback(sendResult);
          },
          getInfo: function(socketId, callback) {
            callback(getInfoResult);
          }
        }
      }
    };

    spyOn(chrome.sockets.udp, 'create').and.callThrough();
    spyOn(chrome.sockets.udp, 'bind').and.callThrough();
    spyOn(chrome.sockets.udp, 'send').and.callThrough();
    spyOn(chrome.sockets.udp, 'getInfo').and.callThrough();
  });

  it('bind', function() {
    createResult = { socketId: 1025 };
    bindResult = -1, // failure! don't want an infinite loop.
    provider.bind('localhost', 5000, continuation);
    expect(chrome.sockets.udp.create).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.any(Function));
    expect(chrome.sockets.udp.bind).toHaveBeenCalledWith(
        createResult.socketId,
        'localhost',
        5000,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalled();
  });

  it('getInfo', function() {
    createResult = { socketId: 1025 };
    bindResult = -1, // failure! don't want an infinite loop.
    getInfoResult = {
      localAddress: 'localhost',
      localPort: '9999'
    };
    provider.bind('localhost', 5000, continuation);
    provider.getInfo(continuation);
    expect(chrome.sockets.udp.getInfo).toHaveBeenCalledWith(
        createResult.socketId,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(getInfoResult);
  });

  it('sendTo', function() {
    createResult = { socketId: 1025 };
    bindResult = -1, // failure! don't want an infinite loop.
    sendResult = {
      bytesSent: 4
    };
    provider.bind('localhost', 5000, continuation);
    provider.sendTo(new ArrayBuffer(), 'localhost', 7000, continuation);
    expect(chrome.sockets.udp.send).toHaveBeenCalledWith(
        createResult.socketId,
        jasmine.any(ArrayBuffer),
        'localhost',
        7000,
        jasmine.any(Function));
    expect(continuation).toHaveBeenCalledWith(sendResult.bytesSent);
  });

  // TODO: recvFrom
});
