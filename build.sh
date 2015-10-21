browserify keybaseAPI.js -o js/keybaseAPI-bundle.js -s KeybaseAPI --insert-globals
browserify -t babelify hello.js -o js/hello-bundle.js --insert-globals
