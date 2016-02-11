#!/bin/bash
mkdir -p gen
watchify -t babelify src/web/js/inbox.js -o gen/inbox-bundle.js --insert-globals --debug -v & \
watchify -t babelify src/web/js/invite.js -o gen/invite-bundle.js --insert-globals --debug -v & \
watchify -t babelify src/web/js/signup.js -o gen/signup-bundle.js --insert-globals --debug -v & \
watchify src/web/js/keybaseAPI.js -o gen/keybaseAPI-bundle.js -s KeybaseAPI --insert-globals --debug -v
