const build = require('./build-utils');
const fs = require('fs');

console.log('Compiling JavaScript bundles for Electron...');

if (!fs.existsSync('gen')){
  fs.mkdirSync('gen');
}

build.electronBundle('src/web/js/login.js', 'gen/login-electron.js');
build.electronBundle('src/web/js/inbox.js', 'gen/inbox-electron.js');
build.electronBundle('src/web/js/signup.js', 'gen/signup-electron.js');