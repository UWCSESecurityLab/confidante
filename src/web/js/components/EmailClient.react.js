'use strict';

/*eslint-disable no-unused-vars*/
var ComposeButton = require('./ComposeButton.react');
var ComposeArea = require('./ComposeArea.react');
var Inbox = require('./Inbox.react');
var InviteButton = require('./InviteButton.react');
var RefreshButton = require('./RefreshButton.react');
/*eslint-enable no-unused-vars*/

var React = require('react');

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
        <InviteButton />
        <RefreshButton />
        <ComposeArea />
        <Inbox />
      </div>
    );
  }
});

module.exports = EmailClient;
