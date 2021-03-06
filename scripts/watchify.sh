#!/bin/bash
mkdir -p gen
watchify -t [ babelify --presets [ es2015 react ] ] src/web/js/inbox.js -o gen/inbox-bundle.js --insert-globals --debug -v & \
watchify -t [ babelify --presets [ es2015 react ] ] src/web/js/invite.js -o gen/invite-bundle.js --insert-globals --debug -v & \
watchify -t [ babelify --presets [ es2015 react ] ] src/web/js/signup.js -o gen/signup-bundle.js --insert-globals --debug -v & \
watchify -t [ babelify --presets [ es2015 react ] ] src/web/js/login.js -o gen/login-bundle.js --insert-globals --debug -v & \
watchify -t [ babelify --presets [ es2015 react ] ] src/web/js/handleOAuth.js -o gen/handleOAuth-bundle.js --insert-globals --debug -v
