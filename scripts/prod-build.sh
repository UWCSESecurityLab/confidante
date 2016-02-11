#!/bin/bash
mkdir -p gen

browserify -t babelify src/web/js/keybaseAPI.js -s KeybaseAPI | uglifyjs --compress -o gen/keybaseAPI-bundle.js
browserify -t babelify src/web/js/inbox.js | uglifyjs --compress -o gen/inbox-bundle.js
browserify -t babelify src/web/js/invite.js | uglifyjs --compress -o gen/invite-bundle.js
browserify -t babelify src/web/js/signup.js | uglifyjs --compress -o gen/signup-bundle.js
