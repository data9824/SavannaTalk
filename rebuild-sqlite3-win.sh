#!/bin/bash

cd node_modules/sqlite3
npm run prepublish
node-gyp configure --module_name=node_sqlite3 --module_path=../lib/binding/electron-v0.36-win32-x64
node-gyp rebuild --target=0.36.12 --arch=x64 --target_platform=win32 --dist-url=https://atom.io/download/atom-shell --module_name=node_sqlite3 --module_path=../lib/binding/electron-v0.36-win32-x64 --msvs_version=2015
cd ../..
