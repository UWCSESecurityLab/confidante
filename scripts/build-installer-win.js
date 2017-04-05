const fs = require('fs');
const installer = require('electron-winstaller');
const package = require('../package.json');

if (!fs.existsSync('dist/Confidante-win32-x64')){
  console.log('Couldn\'t find Electron package in dist/Confidante-win32-x64');
  console.log('Try running "npm run build:electron" before running this script again');
  process.exit(1);
}

installer.createWindowsInstaller({
  appDirectory: 'dist/Confidante-win32-x64',
  outputDirectory: 'dist/Confidante-win32-installer',
  authors: 'UW Security and Privacy Lab',
  owners: 'UW Security and Privacy Lab',
  exe: 'Confidante.exe',
  description: 'Usable encrypted email, with Keybase',
  version: package.version,
  title: 'Confidante: Usable Encrypted Email',
  name: 'Confidante',
  setupExe: 'ConfidanteSetup.exe',
  noMsi: true
}).then(function() {
  console.log('Successfully created windows installer in dist/Confidante-win32-installer');
}).catch(function(error) {
  console.error(error);
});