#!/bin/bash
# Get The locations that the current checked-out version lives.
FREEDOMCR="https://github.com/freedomjs/freedom-for-chrome/commit"
COMMIT=$(git rev-parse HEAD)
BRANCH=$(git name-rev --name-only HEAD | cut -d "/" -f3)
TAG=$(git describe --abbrev=0 --tags)
#TAG=$(git describe --exact-match --tags HEAD 2>/dev/null)

# Clone
rm -rf build/freedomjs
git clone git@github.com:freedomjs/freedomjs.github.io.git build/freedomjs

# Copy latest release
mkdir -p build/freedomjs/dist/freedom-for-chrome
cp freedom-for-chrome.js build/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.$TAG.js
#cp freedom-for-chrome.js.map build/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.$TAG.js.map

# Link to the latest
rm -f build/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js*
ln -s freedom-for-chrome.$TAG.js build/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js
#ln -s freedom-for-chrome.$TAG.js.map build/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js.map

# Commit
cd build/freedomjs
git add -A .
git commit -m $FREEDOMCR/$COMMIT
git push origin master
