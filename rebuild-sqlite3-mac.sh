#!/bin/bash

cd node_modules/sqlite3
npm run prepublish
node-gyp configure --module_name=node_sqlite3 --module_path=../lib/binding/electron-v1.3-win32-x64
node-gyp rebuild --target=1.3.5 --arch=x64 --target_platform=darwin --dist-url=https://atom.io/download/atom-shell --module_name=node_sqlite3 --module_path=../lib/binding/electron-v1.3-darwin-x64
cd ../..
