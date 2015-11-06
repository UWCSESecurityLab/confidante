'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var InboxActions = require('../actions/InboxActions');

/**
 * A message is one email message inside a thread, displayed in the inbox.
 * It decrypts its contents.
 */
var Message = React.createClass({
  getInitialState: function() {
    return {
      body: 'Decrypting...'
    }
  },
  componentDidMount: function() {
    var message = messageParsing.getMessageBody(this.props.message);
    keybaseAPI.getPrivateManager()
      .then(keybaseAPI.decrypt(message))
      .then(function(decryptedBody) {
        this.setState({body: decryptedBody});
      }.bind(this))
      .catch(function(err) {
        console.log(err);
        this.setState({body: 'Could not decrypt body: ' + err});
      }.bind(this));
  },

  reply: function() {
    InboxActions.setInReplyTo(this.props.message);
  },

  render: function() {
    var subject = messageParsing.getMessageHeader(this.props.message, 'Subject');
    var from = messageParsing.getMessageHeader(this.props.message, 'From');
    var to = messageParsing.getMessageHeader(this.props.message, 'To');
    var body = 'HI';

    if (this.props.error) {
      body = this.props.error.toString();
    } else {
      body = this.props.plaintext;
    }

    return (
      <div className="message">
        <div className="messageHeader">
          <strong>{from}</strong>
          <p>To: {to}</p>
        </div>
        <div className="messageBody">
          {body}
        </div>
        <button type="button" className="btn btn-primary" data-toggle="modal" data-target="#composeMessage" onClick={this.reply}>
          Reply
        </button>
      </div>
    );
  }
});

module.exports = Message;
