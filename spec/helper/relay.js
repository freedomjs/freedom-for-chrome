var port = 9999;

// This code sends the report.
var send = function () {  
  var req = new XMLHttpRequest();
  req.open('post', 'http://localhost:' + port + '/put', true);

  var specs = jsApiReporter.specs();
  var tosend = JSON.stringify(specs);
  console.log(tosend);
  req.send(tosend);
};

// This will run periodically to see if the testing is done.
var report = function() {
  if(jsApiReporter.finished) {
    console.log('sending!');
    send();
    window.clearInterval(iv);
  }
};

var iv = window.setInterval(report, 300);

window.addEventListener('load', function() {
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf('relay.js') > -1) {
      port = parseInt(scripts[i].src.substr(scripts[i].src.indexOf('?port=') + 6));
      console.log('Transmitting on Port ' + port);
      break;
    }
  }

  var req = new XMLHttpRequest();
  req.open('get', 'http://localhost:' + port + '/ready', true);
  req.send();
}, true);
