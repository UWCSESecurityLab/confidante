'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions.js');

var RefreshButton = React.createClass({
  render: function() {
    return (
      <button type="button"
              className="btn btn-primary"
              onClick={InboxActions.refresh}>
        <span className="glyphicon glyphicon-refresh" aria-hidden="true"></span>
      </button>
    )
  }
});

module.exports = RefreshButton;
