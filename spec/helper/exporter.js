//sends messages with jasmine output to the connector so the web driver can access them.

var reporter = function(j) {
  function reporter() {
    var el;
    var bad = 0;
    var report = '';

    this.initialize = function() {
      el = document.createElement('webview');
      el.src = 'file://' + FILEBASE + '/app/connector.html';
      document.body.appendChild(el);
    }

    this.jasmineStarted = function(options) {
      report += 'Started\n';
      update();
    }
    this.suiteStarted = function(result) {
      report += result + '\n';
      update();
    };

    this.specStarted = function(result) {
    };

    this.specDone = function(result) {
      report += result.fullName + ': ' + result.status + '\n';
      if (result.status == 'failed') {
        bad++;
      }
      update();
    };

    this.jasmineDone = function() {
      report = 'DONE: ' + bad;
      update();
    }
  }
  
  function update() {
    el.contentWindow.postMessage(report, '*');
  }

  return reporter;
};

var env = window.jasmine.getEnv();
env.addReporter(reporter)