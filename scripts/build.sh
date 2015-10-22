#!/bin/bash
mkdir -p gen

browserify keybaseAPI.js -o js/keybaseAPI-bundle.js -s KeybaseAPI --insert-globals --debug
browserify -t babelify inbox.js -o js/inbox-bundle.js --insert-globals --debug
