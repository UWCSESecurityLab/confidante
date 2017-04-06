'use strict';

const React = require('react');
const InboxActions = require('../actions/InboxActions.js');

var RefreshButton = React.createClass({
  propTypes: {
    spinning: React.PropTypes.bool
  },

  render: function() {
    return (
      <button type="button"
              id="refresh-button"
              className="btn btn-primary inbox-button"
              onClick={InboxActions.refresh}>
        <span className={(this.props.spinning ? 'spinning ' : '') + 'glyphicon glyphicon-refresh'}
              aria-hidden="true"></span>
      </button>
    );
  }
});

module.exports = RefreshButton;
