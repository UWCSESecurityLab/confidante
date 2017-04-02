const build = require('./build-utils');
const fs = require('fs');
const packager = require('electron-packager');

if (!fs.existsSync('gen')){
  fs.mkdirSync('gen');
}

build.electronBundle('src/web/js/login.js', 'gen/login-electron.js');
build.electronBundle('src/web/js/inbox.js', 'gen/inbox-electron.js');
build.electronBundle('src/web/js/signup.js', 'gen/signup-electron.js');

packager({ dir: '.', name: 'Confidante', overwrite: true }, function(err, appPaths) {
  if (err) {
    console.error(err);
  } else {
    appPaths.forEach(console.log);
  }
});