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
        socket.close();
      }, 500);
    });
  });
});