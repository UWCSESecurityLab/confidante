'use strict';
const flags = require('../../../flags');
const InboxActions = require('../actions/InboxActions');
const React = require('react');

let GlobalError = React.createClass({
  getInitialState: function() {
    return { error: null };
  },

  renderAuthError: function() {
    return (
      <div id="global-error" className="alert alert-warning" role="alert">
        Your Gmail login has expired!
        <a onClick={InboxActions.logout}>Please sign in again.</a>
      </div>
    );
  },

  renderKeybaseError: function() {
    return (
      <div id="global-error" className="alert alert-warning" role="alert">
        Your Keybase login has expired!
        <a onClick={InboxActions.logout}>Please sign in again.</a>
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
      <div id="global-error" className="alert alert-warning" role="alert">
        Something went wrong in Confidante: {this.props.error.message}
        <a href={flags.ELECTRON ? './mail.ejs' : '/mail'}>Try refreshing the page.</a>
      </div>
    );
  },

  render: function() {
    switch (this.props.error.name) {
      case 'AuthError':
        return this.renderAuthError();
      case 'KeybaseError':
        return this.renderKeybaseError();
      case 'NetworkError':
        return this.renderNetworkError();
      default:
        return this.renderUnknownError();
    }
  }
});

module.exports = GlobalError;