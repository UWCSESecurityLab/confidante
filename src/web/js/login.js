'use strict';
const Login = require('./components/Login.react');
const React = require('react');
const ReactDOM = require('react-dom');
const KeybaseAPI = require('./keybaseAPI');
const GoogleOAuth = require('../../googleOAuth');
const flags = require('../../flags');

if (!flags.ELECTRON) {
  if (KeybaseAPI.loggedIn()) {
    window.location.href = GoogleOAuth.getAuthUrl();
  }
}

ReactDOM.render(<Login/>, document.getElementById('app'));
