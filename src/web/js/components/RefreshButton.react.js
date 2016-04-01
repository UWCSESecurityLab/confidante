'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions.js');

var RefreshButton = React.createClass({
  render: function() {
    return (
      <button type="button"
              id="refresh-button"
              className="btn btn-primary inbox-button"
              onClick={InboxActions.refresh}>
        <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
      </button>
    )
  }
});

module.exports = RefreshButton;
