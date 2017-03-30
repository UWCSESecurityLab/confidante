'use strict';
const browserify = require('browserify');
const fs = require('fs');
const insertGlobals = require('insert-module-globals');

function electronBundle(input, output) {
  browserify({
    entries: input,
    debug: true,
    commondir: false,
    builtins: false,
    browserField: false,
    insertGlobalVars: {
      __filename: insertGlobals.vars.__filename,
      __dirname: insertGlobals.vars.__dirname,
      process: function() {
        return;
      }
    }
  }).transform('babelify', {presets: ['es2015', 'react']})
    .bundle()
    .on('error', function(err){
      console.error(err.stack);
    })
    .pipe(fs.createWriteStream(output));
}

module.exports = {
  electronBundle: electronBundle
};