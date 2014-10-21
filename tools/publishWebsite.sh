#!/bin/bash
# Get The locations that the current checked-out version lives.
FREEDOMCR="https://github.com/freedomjs/freedom-for-chrome/commit"
COMMIT=$(git rev-parse HEAD)
BRANCH=$(git name-rev --name-only HEAD | cut -d "/" -f3)
TAG=$(git describe --abbrev=0 --tags)
#TAG=$(git describe --exact-match --tags HEAD 2>/dev/null)

# Clone
rm -rf tools/freedomjs
git clone git@github.com:freedomjs/freedomjs.github.io.git tools/freedomjs

# Copy latest release
mkdir -p tools/freedomjs/dist/freedom-for-chrome
cp freedom-for-chrome.js tools/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.$TAG.js
cp freedom-for-chrome.js.map tools/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.$TAG.js.map

# Link to the latest
rm -f tools/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js*
ln -s freedom-for-chrome.$TAG.js tools/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js
ln -s freedom-for-chrome.$TAG.js.map tools/freedomjs/dist/freedom-for-chrome/freedom-for-chrome.latest.js.map

# Commit
cd tools/freedomjs
git add -A .
git commit -m $FREEDOMCR/$COMMIT
git push origin master
