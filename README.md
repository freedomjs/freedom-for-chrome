freedom.js Chrome Runtime
======================

A Chrome runtime for [freedom](https://github.com/UWNetworksLab/freedom) apps.

This repository contains a set of providers implementing freedomjs Interfaces
in a chrome app context, and a prebuilt version of freedomjs suitable for
direct inclusion within a chrome packaged app.

Using Directly
--------------

Download the latest ```freedom.js``` release and include it in your app either
in your background page if you want persistant funcitionality, or in your
launch page if you do not.

Dependening on freedom.js
-------------------------

This repository is packaged in the npm repository as freedom-runtime-chrome.
If you are using npm-based dependency management for your app, you can

    npm install --save freedom-runtime-chrome

The npm distribution contains a prebuilt version of the output file, which
can be linked to at ```node_modules/freedom-runtime-chrome/freedom.js```.

Reporting Issues
----------------

The issues section of this repository is the correct location to report
issues with this distribution. For questions about usage, you can also find
general freedom support available on our mailing list, freedom@cs.uw.edu.
