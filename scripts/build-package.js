const fs = require('fs');
const packager = require('electron-packager');

if (!fs.existsSync('gen/inbox-electron.js') ||
    !fs.existsSync('gen/login-electron.js') ||
    !fs.existsSync('gen/signup-electron.js')){
  console.log('Couldn\'t find Electron bundles in gen/');
  console.log('Try running "npm run build:electron" before running this script again');
  process.exit(1);
}

if (!fs.existsSync('dist')){
  fs.mkdirSync('dist');
}

packager({
  dir: '.',
  out: 'dist',
  overwrite: true,
  asar: true,
  name: 'Confidante',
  win32metadata: {
    CompanyName: 'UW CSE Security and Privacy Lab',
    FileDescription: 'Usable Encrypted Email',
    OriginalFilename: 'Confidante.exe',
    ProductName: 'Confidante',
    InternalName: 'Confidante'
  }
}, function(err, appPaths) {
  if (err) {
    console.error(err);
  } else {
    appPaths.forEach(console.log);
  }
});