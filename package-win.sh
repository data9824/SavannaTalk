#!/bin/bash

rm -rf release/SavannaTalk-win32-x64/
./node_modules/.bin/electron-packager . SavannaTalk --platform=win32 --arch=x64 --version=1.4.1 \
    --ignore=release --ignore=src --ignore=typings --ignore=build --ignore=.idea --ignore=resources \
		--icon=resources/app.ico \
    --version-string.FileDescription=SavannaTalk \
    --version-string.ProductName=SavannaTalk \
    --version-string.OriginalFilename=SavannaTalk.exe \
    --version-string.LegalCopyright="CC0 1.0 Universal" \
    --out release --overwrite
cp -r node_modules/sqlite3/ release/SavannaTalk-win32-x64/resources/app/node_modules/
# 壊れたZIPファイルが生成されてしまう
# pushd .
# cd release/
# rm SavannaTalk-win32-x64.zip
# zip -r SavannaTalk-win32-x64.zip SavannaTalk-win32-x64
# popd
