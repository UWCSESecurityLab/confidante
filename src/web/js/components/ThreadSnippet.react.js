'use strict';

/*eslint-disable no-unused-vars*/
var Thread = require('./Thread.react');
/*eslint-enable no-unused-vars*/

var React = require('react');
var InboxActions = require('../actions/InboxActions.js');
var messageParsing = require('../messageParsing');

/**
 * A thread snippet is a preview of the email, which is displayed in the inbox
 * or other mailboxes. When clicked, it shows the content of the whole thread.
 */
var ThreadSnippet = React.createClass({
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
      let threadFrom = messageParsing.getPeopleInThread(
        this.props.thread,
        document.getElementById('myEmail').innerHTML
      );
      let lastDate = new Date(messageParsing.getMessageHeader(
          this.props.thread.messages[this.props.thread.messages.length - 1],
          'Date'));

      let timestamp;
      if (Date.now() - lastDate < 86400000) {
        timestamp = lastDate.toLocaleTimeString();
      }  else {
        timestamp = lastDate.toLocaleDateString();
      }

      let snippetClass = 'row snippet';
      if (this.isUnread()) {
        snippetClass += ' unreadSnippet';
      }

      return (
        <div className={snippetClass} onClick={this.openThread}>
          <div className="snippet-item">{threadFrom}</div>
          <div className="snippet-item">{threadSubject}</div>
          <div className="snippet-item snippet-timestamp">{timestamp}</div>
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
