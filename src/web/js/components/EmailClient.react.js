'use strict';

var React = require('react');
var ComposeArea = require('./ComposeArea.react');
var ComposeButton = require('./ComposeButton.react');
var ArchiveButton = require('./ArchiveButton.react');
var DeleteButton = require('./DeleteButton.react');
var Header = require('./Header.react');
var Inbox = require('./Inbox.react');
var InviteButton = require('./InviteButton.react');
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
  },

  checkError: function() {
    let error = MessageStore.getGlobalError();
    if (error.name === 'AuthError') {
      this.setState({
        error: 'Your login has expired!',
        errorLinkText: 'Please sign in again.',
        errorLink: '/logout'
      });
    } else if (error.name === 'NetworkError') {
      this.setState({
        error: 'Couldn\'t connect to Gmail.',
        errorLinkText: 'Try refreshing the page.',
        errorLink: '/mail'
      });
    } else if (error === 'INTERNAL ERROR') {
      this.setState({
        error: 'Something went wrong in the ' + this.props.serverVars.toolname + '.',
        errorLinkText: 'Try refreshing the page.',
        errorLink: '/mail'
      });
    } else {
      this.setState({
        error: '',
        errorLinkText: '',
        errorLink: ''
      });
    }
  },

  onMessageStoreChange: function() {
    this.checkError();
    this.setState({ refreshing: false });
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
        <Header toolname={this.props.serverVars.toolname}
                email={this.props.serverVars.email}
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
          <InviteButton />
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
