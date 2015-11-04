'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');

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

  render: function() {
    var subject = messageParsing.getMessageHeader(this.props.message, 'Subject');
    var from = messageParsing.getMessageHeader(this.props.message, 'From');
    var to = messageParsing.getMessageHeader(this.props.message, 'To');

    return (
      <div className="message">
        <div className="messageHeader">
          <strong>{from}</strong>
          <p>To: {to}</p>
        </div>
        <div className="messageBody">
          {this.state.body}
        </div>
      </div>
    );
  }
});

module.exports = Message;
