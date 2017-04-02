'use strict';

var React = require('react');
var ComposeArea = require('./ComposeArea.react');
var ComposeButton = require('./ComposeButton.react');
var ArchiveButton = require('./ArchiveButton.react');
var DeleteButton = require('./DeleteButton.react');
var flags = require('../../../flags');
var Header = require('./Header.react');
var Inbox = require('./Inbox.react');
var MessageStore = require('../stores/MessageStore.js');
var RefreshButton = require('./RefreshButton.react');
var ThreadScrollers = require('./ThreadScrollers.react');

import Toast, {notify} from 'react-notify-toast';

/**
 * The EmailClient is the whole kit and kaboodle of the email client,
 * including the inbox and compose area.
 *
 * It's rendered at the top level of the app.
 */
var EmailClient = React.createClass({
  getInitialState: function() {
    return {
      disablePrev: true,
      disableNext: true,
      email: '',
      error: '',
      errorLinkText: '',
      errorLink: '',
      mailbox: 'Inbox',
      refreshing: false,
    }
  },

  componentDidMount: function() {
    MessageStore.addChangeListener(this.onMessageStoreChange);
    MessageStore.addRefreshListener(this.onRefreshing);
    MessageStore.getGmailClient().getEmailAddress().then(function(email) {
      this.setState({ email: email });
    }.bind(this));
  },

  checkError: function() {
    let error = MessageStore.getGlobalError();
    if (!error) {
     this.setState({
       error: '',
       errorLinkText: '',
       errorLink: ''
     });
   } else if (error.name === 'AuthError') {
      this.setState({
        error: 'Your login has expired!',
        errorLinkText: 'Please sign in again.',
        errorLink: flags.ELECTRON ? './login.ejs' : '/logout'
      });
    } else if (error.name === 'NetworkError') {
      this.setState({
        error: 'Couldn\'t connect to Gmail.',
        errorLinkText: 'Try refreshing the page.',
        errorLink: flags.ELECTRON ? './mail.ejs' : '/mail'
      });
    } else if (error.name === 'UnsupportedError') {
      this.setState({
        error: 'Something went wrong in ' + this.props.serverVars.toolname + ' (' + error.message + ')',
        errorLinkText: 'Try refreshing the page.',
        errorLink: flags.ELECTRON ? './mail.ejs' : '/mail'
      });
    }
  },

  onMessageStoreChange: function() {
    this.checkError();
    this.setState({ refreshing: false });

    if (this.state.email === '') {
      MessageStore.getGmailClient().getEmailAddress().then(function(email) {
        this.setState({ email: email });
      }.bind(this));
    }
  },

  onRefreshing: function() {
    this.setState({ refreshing: true });
  },

  onSent: function() {
    notify.show('Your message has been encrypted and sent', 'success');
  },

  render: function() {
    return (
      <div>
        <Header toolname="Confidante"
                email={this.state.email}
                staging={this.props.serverVars.staging}
                mailbox={this.state.mailbox}/>
        <div className="container">
          <ComposeButton/>
          <ArchiveButton />
          <DeleteButton />
          <RefreshButton spinning={this.state.refreshing}/>
          { this.state.refreshing
            ? <span id="loading-text">Loading...</span>
            : null
          }
          { this.state.error
            ? <div id="global-error" className="alert alert-warning" role="alert">
                {this.state.error} <a href={this.state.errorLink}>{this.state.errorLinkText}</a>
              </div>
            : null
          }
          <ComposeArea onSent={this.onSent} toolname={this.props.serverVars.toolname} />
          <Inbox linkidToOpen={this.props.linkidToOpen} />
          <ThreadScrollers disablePrev={this.state.disablePrev} disableNext={this.state.disableNext}/>
          <Toast/>
        </div>
      </div>
    );
  }
});

module.exports = EmailClient;
