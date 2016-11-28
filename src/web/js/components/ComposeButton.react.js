'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');
var ComposeArea = require('./ComposeArea.react');

/**
 * The compose button opens the compose UI to write a new (non-reply) email.
 */
var ComposeButton = React.createClass({
  getInitialState: function() {
    return { 
      showComposeUI: false
    };
  },

  onClick: function() {
    this.setState({ showComposeUI: true });
  },

  /*ADD THIS FUNCTIONALITY BACK*/
  setNullReply: function() {
    InboxActions.setInReplyTo({
      replyAll: false,
      message: {}
    });
  },

  render: function() {
    return (
      <div>
        <button type="button"
                id="compose-button"
                className="btn btn-primary inbox-button"
                onClick={this.onClick}>
          Compose Message
        </button>
        <div>
          <ComposeArea onComposeUI={true}/>
        </div>
      </div>
    );
  }
});

module.exports = ComposeButton;
