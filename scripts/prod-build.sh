#!/bin/bash
mkdir -p gen

browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/login.js | uglifyjs --compress -o gen/login-bundle.js
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/inbox.js | uglifyjs --compress -o gen/inbox-bundle.js
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/invite.js | uglifyjs --compress -o gen/invite-bundle.js
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/signup.js | uglifyjs --compress -o gen/signup-bundle.js
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/handleOAuth.js | uglifyjs --compress -o gen/handleOAuth-bundle.js
