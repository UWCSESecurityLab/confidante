#!/bin/bash
browserify -t [ babelify --presets [ es2015 react ] ] src/web/js/inbox.js --full-paths --insert-globals --debug | discify --open
