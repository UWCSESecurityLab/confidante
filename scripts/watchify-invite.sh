#!/bin/bash
mkdir -p gen
watchify -t babelify src/web/js/invite.js -o gen/invite-bundle.js --insert-globals --debug -v
