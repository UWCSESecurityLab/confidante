'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');

/**
 * The archive button archives all selected messages in the inbox.
 */
var ArchiveButton = React.createClass({
  archiveSelectedMessages: function() {
    InboxActions.archiveSelectedMessages({});
  },

  render: function() {
    return (
      <button type="button"
              id="archive-button"
              className="btn btn-primary inbox-button"
              data-toggle="modal"
              data-target="#archiveMessage"
              onClick={this.archiveSelectedMessages}>
        Archive 
      </button>
    );
  }
});

module.exports = ArchiveButton;
