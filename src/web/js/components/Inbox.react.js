'use strict';

var React = require('react');
var MessageStore = require('../stores/MessageStore');
var ThreadSnippet = require('./ThreadSnippet.react');

/**
 * An Inbox represent's the user's encrypted inbox, consisting of a list
 * of ThreadSnippets.
 */
var Inbox = React.createClass({
  getInitialState: function() {
    return {
      threads: []
    };
  },

  getMail: function() {
    this.setState(MessageStore.getAll());
  },

  componentDidMount: function() {
    MessageStore.addChangeListener(this.getMail);
  },

  render: function() {
    let linkids = MessageStore.getAll().linkids;
    var snippets = this.state.threads.map(function(thread) {
      let threadLinkid = null;
      thread.messages.forEach(function(message) {
        if (linkids[message.id]) {
          threadLinkid = linkids[message.id];
        }
      });
      return (<li key={thread.id}>
                <ThreadSnippet thread={thread}
                               errors={this.state.errors}
                               signers={this.state.signers}
                               plaintexts={this.state.plaintexts}
                               startOpen={this.props.linkidToOpen === threadLinkid}/>
              </li>);
    }.bind(this));
    if (snippets.length == 0) {
      return (
        <div className="inbox">
          <div className="row snippet">No encrypted emails!</div>
        </div>
      );
    }
    return (
      <div className="inbox">
        <ul>
          {snippets}
        </ul>
      </div>
    );
  }
});

module.exports = Inbox;
