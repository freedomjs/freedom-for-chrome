var myId;
window.messages = [];

// This code finds how the relay was included on the page to learn what channel
// to transmit on.
window.addEventListener('load', function() {
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    console.warn(scripts[i].src);
    if (scripts[i].src.indexOf('relay.js') > -1) {
      myId = scripts[i].src.substr(scripts[i].src.indexOf('?id=') + 4);
      console.log('Transmitting on Channel ' + myId);
      break;
    }
  }
}, true);

// This code sends the report.
var send = function() {
  var conn = new WebSocket('wss://p2pbr.com/route/' + myId);
  conn.onmessage = function(m) {
    console.log(m.data);
    var msg = JSON.parse(m.data);
    if (msg.cmd == 'state') {
      var other;
      for (var i = 0; i < msg.msg.length; i++) {
        if (msg.msg[i] != msg.id) {
          other = msg.msg[i];
          break;
        }
      }

      var specs = jsApiReporter.specs();
      var tosend = JSON.stringify({
        to: other,
        msg: specs
      });
      console.log(tosend);
      conn.send(tosend);
    }
  }
};

// This will run periodically to see if the testing is done.
var report = function() {
  if(jsApiReporter.finished) {
    console.log('sending!');
    send();
    window.clearInterval(iv);
    window.messages.push(jsApiReporter.specs());
  }
};

var iv = window.setInterval(report, 300);
