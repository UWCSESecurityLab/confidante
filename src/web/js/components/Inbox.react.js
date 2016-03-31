'use strict';

/*eslint-disable no-unused-vars*/
var ThreadSnippet = require('./ThreadSnippet.react');
var MessageStore = require('../stores/MessageStore');
/*eslint-enable no-unused-vars*/

var React = require('react');

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
        <div>
          <div className="row snippet">No encrypted emails!</div>
        </div>
      );
    }
    return (
      <div>
        <ul>
          {snippets}
        </ul>
      </div>
    );
  }
});

module.exports = Inbox;
