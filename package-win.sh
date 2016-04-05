#!/bin/bash

rm -rf pack/SavannaTalk-win32-x64/
./node_modules/.bin/electron-packager . SavannaTalk --platform=win32 --arch=x64 --version=0.36.12 \
    --ignore=pack --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
    --ignore=node_modules/del \
    --ignore=node_modules/gulp \
    --ignore=node_modules/gulp-sass \
    --ignore=node_modules/gulp-typescript \
    --ignore=node_modules/gulp-webpack \
    --ignore=node_modules/webpack \
    --version-string.FileDescription=SavannaTalk \
    --version-string.ProductName=SavannaTalk \
    --version-string.OriginalFilename=SavannaTalk.exe \
    --version-string.LegalCopyright="CC0 1.0 Universal" \
    --out pack --overwrite
cp package.json pack/SavannaTalk-win32-x64/resources/app/
cp resources/README.txt pack/SavannaTalk-win32-x64/
# 壊れたZIPファイルが生成されてしまう
# pushd .
# cd pack/
# rm SavannaTalk-win32-x64.zip
# zip -r SavannaTalk-win32-x64.zip SavannaTalk-win32-x64
# popd
