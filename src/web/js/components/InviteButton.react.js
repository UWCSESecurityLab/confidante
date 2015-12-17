'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');

/**
 * The invite button opens the compose UI to write an invite email.
 */
var InviteButton = React.createClass({
  setInvite: function() {
    InboxActions.setInvite(true);
  },

  render: function() {
    return (
      <button type="button" className="btn btn-primary" id="inviteButton" data-toggle="modal" data-target="#composeMessage" onClick={this.setInvite}>
        Invite
      </button>
    );
  }
});

module.exports = InviteButton;