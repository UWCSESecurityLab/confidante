'use strict';

var React = require('react');

/**
 * The compose button opens the compose UI to write a new (non-reply) email.
 */
var ComposeButton = React.createClass({
  render: function() {
    return (
      <button type="button" className="btn btn-primary" id="composeButton" data-toggle="modal" data-target="#composeMessage">
        Compose Message
      </button>
    )
  }
})

module.exports = ComposeButton;
