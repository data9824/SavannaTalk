#!/bin/bash

rm -rf pack/SavannaTalk-darwin-x64/
./node_modules/.bin/electron-packager . SavannaTalk --platform=darwin --arch=x64 --version=0.36.12 \
    --ignore=pack --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --ignore=node_modules/del \
    --ignore=node_modules/gulp \
    --ignore=node_modules/gulp-sass \
    --ignore=node_modules/gulp-typescript \
    --ignore=node_modules/gulp-webpack \
    --ignore=node_modules/webpack \
    --icon=resources/app.icns \
    --out pack --overwrite
cp package.json pack/SavannaTalk-darwin-x64/SavannaTalk.app/Contents/Resources/app/
cp -r node_modules/sqlite3/ pack/SavannaTalk-darwin-x64/SavannaTalk.app/Contents/Resources/app/node_modules/sqlite3
pushd .
cd pack/SavannaTalk-darwin-x64/
rm ../SavannaTalk-darwin-x64.zip
zip -r ../SavannaTalk-darwin-x64.zip SavannaTalk.app
popd
