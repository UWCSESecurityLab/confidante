'use strict';

var React = require('react');
var Message = require('./Message.react');
var messageParsing = require('../messageParsing');

var Thread = React.createClass({
  getInitialState: function() {
    return {
      messages: [],
      checked: false,
    }
  },
  close: function() {
    this.props.closeCallback();
  },
  render: function() {
    var messages = this.props.thread.messages.map(function(message) {
      return <li key={message.id}> <Message message={message} /> </li>
    });
    var subject = messageParsing.getThreadHeader(this.props.thread, 'Subject');
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
})

module.exports = Thread;
