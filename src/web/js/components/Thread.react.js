'use strict';

var React = require('react');
var Message = require('./Message.react');
var messageParsing = require('../messageParsing');

/**
 * A Thread is 1 or more messages, displayed in full. It's what you see in
 * the app when you click on a thread snippet.
 */
var Thread = React.createClass({
  propTypes: {
    closeCallback: React.PropTypes.func,
    errors: React.PropTypes.object,
    plaintexts: React.PropTypes.object,
    signers: React.PropTypes.object,
    thread: React.PropTypes.object,
    showComposeUI: React.PropTypes.bool,
    closeComposeUI: React.PropTypes.func
  },

  getInitialState: function() {
    return {
      messages: [],
      checked: false,
    };
  },
  close: function() {
    this.props.closeCallback();
  },
  render: function() {
    var messages = this.props.thread.messages.map(function(message) {
      return (<li key={message.id}>
                <Message plaintext={this.props.plaintexts[message.id]}
                         signer={this.props.signers[message.id]}
                         message={message}
                         error={this.props.errors[message.id]}
                         showComposeUI={this.props.showComposeUI} 
                         closeComposeUI={this.props.closeComposeUI}/>
              </li>);
    }.bind(this));
    var subject = messageParsing.getThreadHeader(this.props.thread, 'Subject');
    if (subject === '') {
      subject = '(no subject)';
    }
    return (
      <div className="row thread">
        <div className="threadHeader">
          <h4 className="subjectLine">{subject}</h4>
          <button type="button" className="close threadClose" onClick={this.close}>&times;</button>
        </div>
        <ul>{messages}</ul>
      </div>
    );
  }
});

module.exports = Thread;
