'use strict';

var React = require('react');
var DateFormat = require('dateformat');
var InboxActions = require('../actions/InboxActions.js');
var messageParsing = require('../messageParsing');
var Thread = require('./Thread.react');

/**
 * A thread snippet is a preview of the email, which is displayed in the inbox
 * or other mailboxes. When clicked, it shows the content of the whole thread.
 */
var ThreadSnippet = React.createClass({
  propTypes: {
    thread: React.PropTypes.object,
    plaintexts: React.PropTypes.object,
    errors: React.PropTypes.object,
    signers: React.PropTypes.object,
    startOpen: React.PropTypes.bool
  },
  getInitialState: function() {
    return {
      checked: false,
      fullThread: false
    };
  },
  openThread: function() {
    this.setState({fullThread: true});
    if (this.isUnread()) {
      InboxActions.markAsRead(this.props.thread.id);
      InboxActions.refresh();
    }
  },
  closeThread: function() {
    this.setState({fullThread: false});
  },
  isUnread: function() {
    return this.props.thread.messages.some(function(message) {
      return message.labelIds.some(function(label) {
        return label === 'UNREAD';
      });
    });
  },
  componentDidMount: function() {
    if (this.props.startOpen) {
      this.setState({ fullThread: true });
    }
  },
  render: function() {
    if (!this.state.fullThread) {
      let threadSubject = messageParsing.getThreadHeader(this.props.thread, 'Subject');
      if (threadSubject === '') {
        threadSubject = '(no subject)';
      }
      let threadFrom = messageParsing.getPeopleInThread(
        this.props.thread,
        document.getElementById('myEmail').innerHTML
      );

      let date = new Date(messageParsing.getMessageHeader(
          this.props.thread.messages[this.props.thread.messages.length - 1],
          'Date'));
      let now = new Date(Date.now());
      let timestamp;
      if (date.getDay() == now.getDay()) {
        timestamp = DateFormat(date, 'h:MM tt');
      } else if (date.getYear() == now.getYear()) {
        timestamp = DateFormat(date, 'mmm d');
      } else {
        timestamp = DateFormat(date, 'm/d/yy');
      }

      let snippetClass = 'row snippet';
      if (this.isUnread()) {
        snippetClass += ' unreadSnippet';
      }

      return (
        <div className={snippetClass} onClick={this.openThread}>
          <div className="col-md-1 snippet-checkbox">
            <input type="checkbox" value={this.state.checked} onChange={this.handleChange}></input>
          </div>
          <div className="snippet-from col-md-4 col-xs-8">{threadFrom}</div>
          <div className="snippet-timestamp col-md-2 col-xs-4 col-md-push-5">{timestamp}</div>
          <div className="snippet-subject col-md-5 col-xs-12 col-md-pull-2">{threadSubject}</div>
        </div>
      );
    } else {
      return (<Thread plaintexts={this.props.plaintexts}
                      errors={this.props.errors}
                      thread={this.props.thread}
                      signers={this.props.signers}
                      closeCallback={this.closeThread}/>);
    }
  }
});

module.exports = ThreadSnippet;
