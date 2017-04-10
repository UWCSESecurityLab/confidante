const fs = require('fs');
const fse = require('fs-extra');

if (!fs.existsSync('src/web/css/3rdparty')) {
  fs.mkdirSync('src/web/css/3rdparty');
}

if (!fs.existsSync('src/web/fonts/3rdparty')) {
  fs.mkdirSync('src/web/fonts/3rdparty');
}

if (!fs.existsSync('src/web/js/3rdparty')) {
  fs.mkdirSync('src/web/js/3rdparty');
}

fse.copySync('node_modules/bootstrap/dist/css/', 'src/web/css/3rdparty/');
fse.copySync('node_modules/bootstrap/dist/fonts/', 'src/web/fonts/3rdparty/');
fse.copySync('node_modules/bootstrap/dist/js/', 'src/web/js/3rdparty/');
fse.copySync('node_modules/jquery/dist/', 'src/web/js/3rdparty/');
