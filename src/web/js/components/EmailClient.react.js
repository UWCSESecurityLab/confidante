'use strict';

var React = require('react');
var ComposeButton = require('./ComposeButton.react');
var ComposeArea = require('./ComposeArea.react');
var Inbox = require('./Inbox.react');

/**
 * The EmailClient is the whole kit and kaboodle of the email client,
 * including the inbox and compose area.
 *
 * It's rendered at the top level of the app.
 */
var EmailClient = React.createClass({
  render: function() {
    return (
      <div>
        <ComposeButton />
        <ComposeArea />
        <Inbox />
      </div>
    );
  }
});

module.exports = EmailClient;
