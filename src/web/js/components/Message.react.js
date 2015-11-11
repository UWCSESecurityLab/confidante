'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');

/*eslint-disable no-unused-vars*/
var InboxActions = require('../actions/InboxActions');
var ErrorBody = require('./ErrorBody.react');
/*eslint-enable no-unused-vars*/

/**
 * A message is one email message inside a thread, displayed in the inbox.
 * It decrypts its contents.
 */
var Message = React.createClass({
  getInitialState: function() {
    return {
      body: 'Decrypting...'
    };
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
    var from = messageParsing.getMessageHeader(this.props.message, 'From');
    var to = messageParsing.getMessageHeader(this.props.message, 'To');

    var body;
    if (!this.props.error && this.props.plaintext) {
      body = (
        <div className="messageBody">
          {this.props.plaintext}
        </div>
      );
    } else if (!this.props.error && this.props.plaintext === undefined) {
      body = (
        <div className="messageBody alert alert-info">
          Decrypting...
          <span className="glyphicon glyphicon-refresh spinner"></span>
        </div>
      );
    } else if (this.props.error) {
      body = <ErrorBody error={this.props.error} message={this.props.message} />
    }

    return (
      <div className="message">
        <div className="messageHeader">
          <strong>{from}</strong>
          <p>To: {to}</p>
        </div>
        {body}
        <button type="button" className="btn btn-primary" data-toggle="modal" data-target="#composeMessage" onClick={this.reply}>
          Reply
        </button>
      </div>
    );
  }
});

module.exports = Message;
