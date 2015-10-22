#!/bin/bash
mkdir -p gen

browserify keybaseAPI.js -o gen/keybaseAPI-bundle.js -s KeybaseAPI --insert-globals
browserify -t babelify js/inbox.js -o gen/inbox-bundle.js --insert-globals
