'use strict';
const flags = require('../../../flags');
const InboxActions = require('../actions/InboxActions');
const KeybaseAPI = require('../KeybaseAPI');
const openLink = require('../openLink');
const React = require('react');

let GlobalError = React.createClass({
  getInitialState: function() {
    return { error: null };
  },

  renderGoogleAuthError: function() {
    return (
      <div id="global-error" className="alert alert-warning" role="alert">
        Your Gmail login has expired!
        <a onClick={InboxActions.logout}>Please sign in again.</a>
      </div>
    );
  },

  renderKeybaseAuthError: function() {
    return (
      <div id="global-error" className="alert alert-warning" role="alert">
        Your Keybase login has expired!
        <a onClick={InboxActions.logout}>Please sign in again.</a>
      </div>
    );
  },

  renderNoPrivateKeyError: function() {
    return (
      <div id="global-error" className="alert alert-danger" role="alert">
        To use Confidante, both your public and private key must be stored with
        Keybase. Please update your&nbsp;
        <a href={KeybaseAPI.url() + '/' + KeybaseAPI.getUsername()} onClick={openLink} target="_blank">
          Keybase account
        </a>.
      </div>
    );
  },

  renderNetworkError: function() {
    return (
      <div id="global-error" className="alert alert-warning" role="alert">
        Couldn't connect to Gmail. Check your internet connection or
        <a href={flags.ELECTRON ? './mail.ejs' : '/mail'}> try refreshing the page.</a>
      </div>
    );
  },

  renderUnknownError: function() {
    return (
      <div id="global-error" className="alert alert-danger" role="alert">
        Something went wrong in Confidante: {this.props.error.message}
        <a href={flags.ELECTRON ? './mail.ejs' : '/mail'}>Try refreshing the page.</a>
      </div>
    );
  },

  render: function() {
    switch (this.props.error.name) {
      case 'GoogleAuthError':
        return this.renderGoogleAuthError();
      case 'KeybaseAuthError':
        return this.renderKeybaseAuthError();
      case 'NoPrivateKeyError':
        return this.renderNoPrivateKeyError();
      case 'NetworkError':
        return this.renderNetworkError();
      default:
        return this.renderUnknownError();
    }
  }
});

module.exports = GlobalError;