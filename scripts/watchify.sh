#!/bin/bash
mkdir -p gen
watchify -t babelify src/web/js/inbox.js -o gen/inbox-bundle.js --insert-globals --debug -v & \
watchify -t babelify src/web/js/invite.js -o gen/invite-bundle.js --insert-globals --debug -v & \
watchify -t babelify src/web/js/signup.js -o gen/signup-bundle.js --insert-globals --debug -v & \
watchify -t babelify src/web/js/login.js -o gen/login-bundle.js --insert-globals --debug -v
