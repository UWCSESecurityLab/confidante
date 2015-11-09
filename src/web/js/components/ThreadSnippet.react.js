'use strict';

var React = require('react');
var Thread = require('./Thread.react');
var messageParsing = require('../messageParsing');

/**
 * A thread snippet is a preview of the email, which is displayed in the inbox
 * or other mailboxes. When clicked, it shows the content of the whole thread.
 */
var ThreadSnippet = React.createClass({
  getInitialState: function() {
    return {
      messages: [],
      checked: false,
      fullThread: false
    };
  },
  openThread: function() {
    this.setState({fullThread: true});
  },
  closeThread: function() {
    this.setState({fullThread: false});
  },
  render: function() {
    if (!this.state.fullThread) {
      var threadSubject = messageParsing.getThreadHeader(this.props.thread, 'Subject');
      var threadFrom = messageParsing.getThreadHeader(this.props.thread, 'From');
      return (
        <div className="row snippet" onClick={this.openThread}>
          <div className="col-md-1">
            <input type="checkbox" value={this.state.checked} onchange={this.handleChange}></input>
          </div>
          <div className="col-md-3">
            <strong>{threadFrom}</strong>
          </div>
          <div className="col-md-8">
            {threadSubject}
          </div>
        </div>
      );
    } else {
      return (<Thread plaintexts={this.props.plaintexts}
                      errors={this.props.errors}
                      thread={this.props.thread}
                      closeCallback={this.closeThread}/>);
    }
  }
});

module.exports = ThreadSnippet;
