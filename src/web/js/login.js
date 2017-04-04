'use strict';
const Login = require('./components/Login.react');
const React = require('react');
const ReactDOM = require('react-dom');
const KeybaseAPI = require('./keybaseAPI');
const flags = require('../../flags');

if (!flags.ELECTRON) {
  if (KeybaseAPI.keybaseLoggedIn()) {
    window.location.href = '/mail';
  }
}

ReactDOM.render(<Login/>, document.getElementById('app'));
