'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');

/**
 * The compose button opens the compose UI to write a new (non-reply) email.
 */
var ComposeButton = React.createClass({
  setNullReply: function() {
    InboxActions.setInReplyTo({
      replyAll: false,
      message: {}
    });
  },

  render: function() {
    return (
      <button type="button" className="btn btn-primary" id="composeButton" data-toggle="modal" data-target="#composeMessage" onClick={this.setNullReply}>
        Compose Message
      </button>
    );
  }
});

module.exports = ComposeButton;
