'use strict';

const ArchiveButton = require('./ArchiveButton.react');
const ComposeArea = require('./ComposeArea.react');
const ComposeButton = require('./ComposeButton.react');
const DeleteButton = require('./DeleteButton.react');
const flags = require('../../../flags');
const GlobalError = require('./GlobalError.react');
const Header = require('./Header.react');
const Inbox = require('./Inbox.react');
const KeybaseAPI = require('../keybaseAPI');
const MessageStore = require('../stores/MessageStore.js');
const React = require('react');
const RefreshButton = require('./RefreshButton.react');
const ThreadScrollers = require('./ThreadScrollers.react');

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
      error: null,
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

  onMessageStoreChange: function() {
    this.setState({ refreshing: false, error: MessageStore.getGlobalError() });

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
            ? <GlobalError error={this.state.error}/>
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
