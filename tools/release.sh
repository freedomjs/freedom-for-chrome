#!/bin/bash
# Get The locations that the current checked-out version lives.
FREEDOMCR="https://github.com/freedomjs/freedom-for-chrome/commit"
COMMIT=$(git rev-parse HEAD)
TAG=$(git describe --abbrev=0 --tags)

rm -rf tools/freedomjs
git clone git@github.com:freedomjs/freedomjs.github.io.git tools/freedomjs
mkdir -p tools/freedomjs/release/freedom-chrome

cp freedom-for-chrome.js tools/freedomjs/release/freedom-chrome/freedom-for-chrome.$TAG.js
cp freedom-for-chrome.js tools/freedomjs/release/freedom-chrome/freedom-for-chrome.latest.js

cd tools/freedomjs
git add .
git commit -m $FREEDOMCR/$COMMIT
git push origin master
