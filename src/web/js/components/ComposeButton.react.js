'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');
var ComposeArea = require('./ComposeArea.react');

/**
 * The compose button opens the compose UI to write a new (non-reply) email.
 */
var ComposeButton = React.createClass({
  propTypes: {
    onClick: React.PropTypes.func
  },

  setNullReply: function() {
    InboxActions.setInReplyTo({
      replyAll: false,
      message: {}
    });
  },

  setOnClick: function() {
    InboxActions.setComposeUIOpen({
      message: {}
    });
  },

  onClickFunctions: function() {
    this.setNullReply();
    this.setOnClick();
  },

  render: function() {
    return (
      <button type="button"
              id="compose-button"
              className="btn btn-primary inbox-button"
              onClick={this.onClickFunctions}>
        Compose Message
      </button>
    );
  }
});

module.exports = ComposeButton;
