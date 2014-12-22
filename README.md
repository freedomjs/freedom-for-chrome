freedom.js for Chrome Apps
==========================

A packaging of [freedom.js](https://github.com/freedomjs/freedom) for Chrome
Packaged Apps.

This repository contains a set of providers implementing freedom.js apis
in a chrome app context, and a prebuilt version of freedom.js suitable for
direct inclusion within a chrome packaged app.

Using Directly
--------------

Download the latest
[```freedom-for-chrome.js```](http://freedomjs.org/release/freedom-chrome/freedom-for-chrome.latest.js)
release and include it in your app either in your background page (if you want
persistant funcitionality), or in your launch page (if you do not).

Depending on freedom.js
-------------------------

This repository is packaged in the npm repository as freedom-for-chrome.
If you are using npm-based dependency management for your app, you can

    npm install --save freedom-for-chrome

The npm distribution contains a prebuilt version of the output file, which
can be linked to at ```node_modules/freedom-for-chrome/freedom-for-chrome.js```.

Testing
-------

Running `grunt` will run the standard set of freedom.js unit tests against the generated
freedom-for-chrome.js file, ensuring that the bundle is parseable, and can be loaded
by phantom.js.

Before submitting a pull request, please also run `grunt test` and `grunt cordova`

`grunt integration` will run Selenium tests in a Chrome packaged application.
Depending on your architecture, this may not report results back to the console, and
visual inspection of the test results in the packaged application may be needed.
These tests exercise the functionality of the chrome specific providers in this repository.

To test functionality of changes it is recommended to add tests of the `spec/*.integration.spec.js` type,
and to run an appropriate chrome application example to verify that the change functions appropriately.
For UDP / TCP changes, https://github.com/freedomjs/freedom-social-xmpp has a demonstration exercising
many of the needed APIs.

`grunt cordova` will run the tests in an iframe in a WebView on Android.
Note that this has only been tested on cordova 3.5.0 on Ubuntu 14.04LTS using 
a Nexus 4 device emulator running Android L.
The device must be configured to have an SD card and "Use Host GPU".

Reporting Issues
----------------

The issues section of this repository is the correct location to report
issues with this distribution. For questions about usage, you can also find
general freedom support available on our mailing list, freedom@cs.uw.edu.
