#!/bin/bash
mkdir -p gen

browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/login.js -o gen/login-electron.js --debug --ignore-missing --no-builtins --no-commondir --insert-global-vars=\"global\" --no-browser-field
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/inbox.js -o gen/inbox-electron.js --debug --ignore-missing --no-builtins --no-commondir --insert-global-vars=\"global\" --no-browser-field
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/signup.js -o gen/signup-electron.js --debug --ignore-missing --no-builtins --no-commondir --insert-global-vars=\"global\" --no-browser-field
