'use strict';
const Login = require('./components/Login.react');
const React = require('react');
const ReactDOM = require('react-dom');
const KeybaseAPI = require('./keybaseAPI');
const GoogleOAuth = require('../../googleOAuth');
const flags = require('../../flags');

function redirectToGoogle() {
  if (flags.ELECTRON) {
    ipcRenderer.send('google-redirect');
  } else {
    window.location.href = GoogleOAuth.getAuthUrl();
  }
}

if (!flags.ELECTRON) {
  if (KeybaseAPI.keybaseLoggedIn()) {
    redirectToGoogle();
  }
}

ReactDOM.render(<Login/>, document.getElementById('app'));
