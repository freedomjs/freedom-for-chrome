describe('Tcpsocket_chrome', function () {
  var socket, dispatch;
  beforeEach(function () {
    dispatch = jasmine.createSpy('dispatchEvent');
    socket = new Socket_chrome(undefined, dispatch);
  });

  function rawStringToBuffer (str) {
    var idx, len = str.length, arr = new Array(len);
    for (idx = 0; idx < len; ++idx) {
        arr[idx] = str.charCodeAt(idx) & 0xFF;
    }
    return new Uint8Array(arr).buffer;
  }
  
  it("Works as a Client", function (done) {
    socket.connect('www.google.com', 80, function() {
      console.warn('connected');
      socket.write(rawStringToBuffer('GET / HTTP/1.0\n\n'), function(okay) {
        console.warn('written');
        expect(okay.bytesWritten).toBeGreaterThan(10);
      });
      setTimeout(function() {
        expect(dispatch).toHaveBeenCalled();
        done();
        socket.close(function() {});
      }, 500);
    });
  });
  
  it("Sends from Client to Server", function(done) {
    var cspy = jasmine.createSpy('client');
    var onconnect = jasmine.createSpy('cconnect');
    var d2 = jasmine.createSpy('rdispatch');
    var client, receiver;
    dispatch.and.callFake(function(evt, msg) {
      console.warn('connection');
      expect(evt).toEqual('onConnection');
      expect(msg.socket).toBeDefined();
      receiver = new Socket_chrome(undefined, d2, msg.socket);
      console.log('new socket id', msg);
    });
    onconnect.and.callFake(function() {
      console.warn('connected');
      var buf = new Uint8Array(10);
      client.write(buf.buffer, function() {});
    });
    d2.and.callFake(function(evt, msg) {
      console.warn('read');
      expect(evt).toEqual('onData');
      expect(msg.data.byteLength).toEqual(10);
      done();
      socket.close(function() {});
      client.close(function() {});
      receiver.close(function() {});
    });
    socket.listen('127.0.0.1', 9981, function() {
      console.warn('listening');
      client = new Socket_chrome(undefined, cspy);
      client.connect('127.0.0.1', 9981, onconnect);
    });
  });
});