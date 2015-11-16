#!/bin/bash
mkdir -p gen
watchify -t babelify src/web/js/inbox.js -o gen/inbox-bundle.js --insert-globals --debug -v
