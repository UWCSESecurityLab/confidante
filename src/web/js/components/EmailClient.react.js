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
      error: '',
      errorLinkText: '',
      errorLink: '',
      mailbox: 'Inbox'
    }
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
    } else {
      this.setState(this.getInitialState());
    }
  },

  componentDidMount: function() {
    MessageStore.addChangeListener(this.checkError);
  },

  render: function() {
    return (
      <div>
        <Header email={this.props.serverVars.email}
                staging={this.props.serverVars.staging}/>
        <div className="container">
          <ComposeButton />
          <RefreshButton />
          <InviteButton />
          { this.state.error
            ? <div className="alert alert-warning" role="alert">
                {this.state.error} <a href={this.state.errorLink}>{this.state.errorLinkText}</a>
              </div>
            : null
          }
          <h1>{this.state.mailbox}</h1>
          <ComposeArea />
          <Inbox linkidToOpen={this.props.linkidToOpen}/>
        </div>
      </div>
    );
  }
});

module.exports = EmailClient;
