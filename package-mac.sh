#!/bin/bash

rm -rf release/SavannaTalk-darwin-x64/
./node_modules/.bin/electron-packager . SavannaTalk --platform=darwin --arch=x64 --version=1.3.5 \
    --ignore=release --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --icon=resources/app.icns \
    --out release --overwrite
cp -r node_modules/sqlite3/ release/SavannaTalk-darwin-x64/SavannaTalk.app/Contents/Resources/app/node_modules/sqlite3
pushd .
cd release/SavannaTalk-darwin-x64/
rm ../SavannaTalk-darwin-x64.zip
zip -r ../SavannaTalk-darwin-x64.zip SavannaTalk.app
popd
