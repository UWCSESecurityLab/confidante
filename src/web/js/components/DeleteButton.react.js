'use strict';

const React = require('react');
const InboxActions = require('../actions/InboxActions');

/**
 * The delete button archives all selected messages in the inbox.
 */
var DeleteButton = React.createClass({
  deleteSelectedThreads: function() {
    InboxActions.deleteSelectedThreads({});
  },

  render: function() {
    return (
      <button type="button"
              id="archive-button"
              className="btn btn-primary inbox-button"
              onClick={this.deleteSelectedThreads}>
        Delete
      </button>
    );
  }
});

module.exports = DeleteButton;
