'use strict';

const React = require('react');
const InboxActions = require('../actions/InboxActions');
const ComposeArea = require('./ComposeArea.react');

/**
 * The compose button opens the compose UI to write a new (non-reply) email.
 */
var ComposeButton = React.createClass({
  setOnClick: function() {
    InboxActions.setInReplyTo({
      replyAll: false,
      message: {}
    });
    InboxActions.resetComposeFields();
    InboxActions.setComposeUIOpen();
  },

  render: function() {
    return (
      <button type="button"
              id="compose-button"
              className="btn btn-primary inbox-button"
              onClick={this.setOnClick}>
        Compose Message
      </button>
    );
  }
});

module.exports = ComposeButton;
