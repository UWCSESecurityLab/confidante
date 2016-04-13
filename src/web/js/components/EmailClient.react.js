'use strict';

var React = require('react');
var MessageStore = require('../stores/MessageStore.js');

/*eslint-disable no-unused-vars*/
var ComposeButton = require('./ComposeButton.react');
var ComposeArea = require('./ComposeArea.react');
var Header = require('./Header.react');
var Inbox = require('./Inbox.react');
var InviteButton = require('./InviteButton.react');
var RefreshButton = require('./RefreshButton.react');
var ThreadScrollers = require('./ThreadScrollers.react');
/*eslint-enable no-unused-vars*/

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
      refreshing: false
    }
  },

  componentDidMount: function() {
    MessageStore.addChangeListener(this.onMessageStoreChange);
    MessageStore.addRefreshListener(this.onRefreshing);
  },

  checkError: function() {
    let error = MessageStore.getNetError();
    if (error === 'AUTHENTICATION') {
      this.setState({
        error: 'Your login has expired!',
        errorLinkText: 'Please sign in again.',
        errorLink: '/login'
      });
    } else if (error === 'NETWORK') {
      this.setState({
        error: 'Couldn\'t connect to Keymail.',
        errorLinkText: 'Try refreshing the page.',
        errorLink: '/mail'
      });
    } else if (error === 'INTERNAL ERROR') {
      this.setState({
        error: 'Something went wrong in the Keymail server.',
        errorLinkText: 'Try refreshing the page.',
        errorLink: '/mail'
      });
    } else {
      this.setState(this.getInitialState());
    }
  },

  onMessageStoreChange: function() {
    this.checkError();
    this.setState({
      refreshing: false,
      mailbox: MessageStore.getCurrentMailboxLabel(),
      disablePrev: MessageStore.getDisablePrev(),
      disableNext: MessageStore.getDisableNext()
    });
  },

  onRefreshing: function() {
    this.setState({ refreshing: true });
  },

  render: function() {
    return (
      <div>
        <Header email={this.props.serverVars.email}
                staging={this.props.serverVars.staging}
                mailbox={this.state.mailbox}/>
        <div className="container">
          <ComposeButton />
          <RefreshButton spinning={this.state.refreshing}/>
          { this.state.refreshing
            ? <span id="loading-text">Loading...</span>
            : null
          }
          <InviteButton />
          { this.state.error
            ? <div className="alert alert-warning" role="alert">
                {this.state.error} <a href={this.state.errorLink}>{this.state.errorLinkText}</a>
              </div>
            : null
          }
          <ComposeArea />
          <Inbox linkidToOpen={this.props.linkidToOpen}/>
          <ThreadScrollers disablePrev={this.state.disablePrev} disableNext={this.state.disableNext}/>
        </div>
      </div>
    );
  }
});

module.exports = EmailClient;
