#!/bin/bash
mkdir -p gen
watchify -t babelify src/web/js/signup.js -o gen/signup-bundle.js --insert-globals --debug -v
