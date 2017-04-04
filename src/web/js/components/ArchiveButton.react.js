'use strict';

const React = require('react');
const InboxActions = require('../actions/InboxActions');

/**
 * The archive button archives all selected messages in the inbox.
 */
var ArchiveButton = React.createClass({
  archiveSelectedThreads: function() {
    InboxActions.archiveSelectedThreads({});
  },

  render: function() {
    return (
      <button type="button"
              id="archive-button"
              className="btn btn-primary inbox-button"
              onClick={this.archiveSelectedThreads}>
        Archive 
      </button>
    );
  }
});

module.exports = ArchiveButton;
