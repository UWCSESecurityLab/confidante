'use strict';

var React = require('react');
var InboxActions = require('../actions/InboxActions');

var ThreadScrollers = React.createClass({
  render: function() {
    return (
      <div className="btn-group" role="group">
        <button type="button"
                className="btn btn-default"
                disabled={this.props.disablePrev}
                onClick={InboxActions.fetchPrevPage}>
          <span className="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
        </button>
        <button type="button"
                className="btn btn-default"
                disabled={this.props.disableNext}
                onClick={InboxActions.fetchNextPage}>
          <span className="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>
        </button>
      </div>
    );
  }
});

module.exports = ThreadScrollers;
