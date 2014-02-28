

describe("Main Test", function() {

  var client = {};
  jasmine.getEnv().defaultTimeoutInterval = 30000;

  beforeEach(function() {
    client = webdriverjs.remote({
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          // args: [
          //   // ChromeDriver doesn't know about SOCKS proxies.
          //   // (see its webdriver_capabilities_parser.cc)
          //   '--load-extension=' + process.env['CHROME_EXTENSION_PATH']
          // ]
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
