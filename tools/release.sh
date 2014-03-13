#!/bin/bash
# Get The locations that the current checked-out version lives.
FREEDOMCR="https://github.com/freedomjs/freedom-for-chrome/commit"
COMMIT=$(git rev-parse HEAD)
TAG=$(git describe --abbrev=0 --tags)

git clone git@github.com:freedomjs/freedomjs.github.io.git tools/freedomjs
mkdir -p tools/freedomjs/release/freedom-chrome

cp freedom.js tools/freedomjs/release/freedom-chrome/freedom.$TAG.js
cp freedom.js tools/freedomjs/release/freedom-chrome/freedom.latest.js

cd tools/freedomjs
git add .
git commit -m $FREEDOMCR/$COMMIT
git push origin master
