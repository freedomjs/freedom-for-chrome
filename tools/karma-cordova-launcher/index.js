var fs = require('fs');

var ChromeApp = function(baseBrowserDecorator, args) {
  baseBrowserDecorator(this);

  var flags = args.flags || [];

  this._getOptions = function(url) {
    // Chrome CLI options
    // http://peter.sh/experiments/chromium-command-line-switches/
    return [
      '--user-data-dir=' + this._tempDir,
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--start-maximized'
    ].concat(flags, [url]);
  };
};

// Return location of chrome.exe file for a given Chrome directory (available: "Chrome", "Chrome SxS").
function getChromeExe(chromeDirName) {
  if (process.platform !== 'win32') {
    return null;
  }
  var windowsChromeDirectory, i, prefix;
  var suffix = '\\Google\\'+ chromeDirName + '\\Application\\chrome.exe';
  var prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];

  for (i = 0; i < prefixes.length; i++) {
    prefix = prefixes[i];
    if (fs.existsSync(prefix + suffix)) {
      windowsChromeDirectory = prefix + suffix;
      break;
    }
  }

  return windowsChromeDirectory;
}

ChromeApp.prototype = {
  name: 'ChromeApp',

  DEFAULT_CMD: {
    linux: 'google-chrome',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    win32: getChromeExe('Chrome')
  },
  ENV_CMD: 'CHROME_BIN'
};

ChromeApp.$inject = ['baseBrowserDecorator', 'args'];

// PUBLISH DI MODULE
module.exports = {
  'launcher:ChromeApp': ['type', ChromeApp]
};
