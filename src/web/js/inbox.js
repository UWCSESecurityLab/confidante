'use strict';

const KeybaseAPI = require('./keybaseAPI');
const flags = require('../../flags');

// Unfortunately, we have to do this check before requiring EmailClient.
// EmailClient requires MessageStore, and MessageStore causes serious errors
// if we're not logged in. This is a bug worthy of fixing in the future.
// TODO: Make it possible to require('MessageStore') without being logged
// in and without errors.
if (!flags.ELECTRON) {
  if (!KeybaseAPI.loggedIn()) {
    window.location.href = '/login';
  }
}

const React = require('react');
const ReactDOM = require('react-dom');
const EmailClient = require('./components/EmailClient.react');

let linkidToOpen = window.location.hash.replace('#linkid:', '');
let serverVars = JSON.parse(document.getElementById('server-vars').innerHTML);

ReactDOM.render(<EmailClient linkidToOpen={linkidToOpen}
                             serverVars={serverVars}/>,
                document.getElementById('app'));
