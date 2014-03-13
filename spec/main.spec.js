var webdriverjs = require("webdriverjs");
//console.log(Object.keys(process.env));

describe("Main Test", function() {

  var client = {};
  jasmine.getEnv().defaultTimeoutInterval = 30000;

  beforeEach(function() {
    
    client = webdriverjs.remote({
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            '--load-extension=' + process.env['EXTENSION_PATH'],
            '--user-data-dir=' + process.env['PROFILE_PATH'],
            '--disable-web-security'
          ]
        }
      }
    });
    client.init();
  });

  it('example.com', function(done) {
    client
      .url('http://example.com/')
      .getTitle(function(err, title) {
        expect(err).toBe(null);
        expect(title).toBe('Example Domain');
      })
      .call(done);
  });
});
