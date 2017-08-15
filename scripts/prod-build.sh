#!/bin/bash
mkdir -p gen

browserify -t [ envify --NODE_ENV production ] -t [ babelify --presets [ es2015 react ] ] src/web/js/login.js -o gen/login-bundle.js
browserify -t [ envify --NODE_ENV production ] -t [ babelify --presets [ es2015 react ] ] src/web/js/inbox.js -o gen/inbox-bundle.js
browserify -t [ envify --NODE_ENV production ] -t [ babelify --presets [ es2015 react ] ] src/web/js/invite.js -o gen/invite-bundle.js
browserify -t [ envify --NODE_ENV production ] -t [ babelify --presets [ es2015 react ] ] src/web/js/signup.js -o gen/signup-bundle.js
browserify -t [ envify --NODE_ENV production ] -t [ babelify --presets [ es2015 react ] ] src/web/js/handleOAuth.js -o gen/handleOAuth-bundle.js
