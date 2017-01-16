'use strict';

var React = require('react');
var DateFormat = require('dateformat');
var InboxActions = require('../actions/InboxActions.js');
var MessageStore = require('../stores/MessageStore');
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
    startOpen: React.PropTypes.bool,
    showComposeUI: React.PropTypes.bool,
    closeComposeUI: React.PropTypes.func
  },

  getInitialState: function() {
    return {}
  },

  openThread: function() {
    InboxActions.setExpandedThread(this.props.thread.id, true);
    if (this.isUnread()) {
      InboxActions.markAsRead(this.props.thread.id);
      InboxActions.refresh();
    }
  },

  closeThread: function() {
    InboxActions.setExpandedThread(this.props.thread.id, false);
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
      InboxActions.setExpandedThread(this.props.thread.id, true);
    }
  },

  handleCheckboxClick: function(e) {
    InboxActions.setChecked(this.props.thread.id, !this.props.thread.checked);
  },

  render: function() {
    if (this.props.thread.id !== MessageStore.getExpandedThreadId()) {
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
        <div className={snippetClass}>
          <div className="col-md-1 snippet-checkbox">
            <input type="checkbox" value={this.props.thread.checked} onClick={this.handleCheckboxClick}></input>
          </div>
          <div onClick={this.openThread} className="snippet-from col-md-4 col-xs-8">{threadFrom}</div>
          <div onClick={this.openThread} className="snippet-timestamp col-md-2 col-xs-4 col-md-push-5">{timestamp}</div>
          <div onClick={this.openThread} className="snippet-subject col-md-5 col-xs-12 col-md-pull-2">{threadSubject}</div>
        </div>
      );
    } else {
      return (<Thread plaintexts={this.props.plaintexts}
                      errors={this.props.errors}
                      thread={this.props.thread}
                      signers={this.props.signers}
                      closeCallback={this.closeThread}
                      showComposeUI={this.props.showComposeUI} 
                      closeComposeUI={this.props.closeComposeUI}/>);
    }
  }
});

module.exports = ThreadSnippet;
