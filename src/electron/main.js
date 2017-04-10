const electron = require('electron');
const {app} = electron;           // Module to control application life.
const {BrowserWindow} = electron; // Module to create native browser window.
const {ipcMain} = electron;

const Config = require('electron-config');
const ejse = require('ejs-electron');
const GoogleOAuth = require('../googleOAuth.js');
const getPort = require('get-port');
const http = require('http');

const version = require('../../package.json').version;

if (require('electron-squirrel-startup')) {
  return;
}

const config = new Config();

const locals = {
  toolname: 'Confidante',
  staging: false,
  email: 'EMAIL',
  loggedIn: false,
  electron: true,
  version: version
};

ejse.setOptions(locals);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({width: 1366, height: 768});

  win.loadURL('file://' + __dirname + '/../web/views/login.ejs');

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// This defines an HTTP Server for handling the OAuth token response.
// The BrowserWindow makes a request to this server on a successful login,
// to transfer the authorization code.
let oauthServerPort;
let oauthServer = http.createServer((request, response) => {
  response.statusCode = 200;
  response.write('<html><body><h2>Logging in...</h2></body></html>');
  response.end();
  oauthServer.close();

  let authCode = request.url.split('/?code=')[1];
  GoogleOAuth.installed.requestAccessToken(authCode, oauthServerPort)
    .then((accessToken) => {
      let token = GoogleOAuth.addTokenExpireTime(accessToken);
      config.set('oauth', JSON.stringify(token));
      win.loadURL('file://' + __dirname + '/../web/views/mail.ejs');
    }).catch((error) => {
      console.error(error);
      // TODO: Show error? Handle more gracefully?
      win.loadURL('file://' + __dirname + '/../web/views/login.ejs');
    });
});

ipcMain.on('google-redirect', (event, arg) => {
  getPort().then(port => {
    oauthServerPort = port;
    oauthServer.listen(port);
    win.loadURL(GoogleOAuth.getAuthUrl(port));
  });
});

ipcMain.on('get-access-token', (event, arg) => {
  let token = config.get('oauth');
  if (!token) {
    event.returnValue = '';
  } else {
    event.returnValue = token;
  }
});

ipcMain.on('delete-access-token', (event, arg) => {
  config.delete('oauth');
});

ipcMain.on('refresh-access-token', (event, arg) => {
  let token = JSON.parse(config.get('oauth'));
  GoogleOAuth.installed.refreshAccessToken(token.refresh_token)
    .then(function(newToken) {
      // Copy over the refresh token before storing.
      newToken.refresh_token = token.refresh_token;
      newToken = GoogleOAuth.addTokenExpireTime(newToken);
      config.set('oauth', JSON.stringify(newToken));
      event.sender.send('refreshed-access-token', newToken);
    }).catch(function(err) {
      console.error(err);
      event.sender.send('refreshed-access-token', null);
    });
});
