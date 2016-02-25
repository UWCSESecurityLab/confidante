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
    var snippets = this.state.threads.map(function(thread) {
      return (<li key={thread.id}>
                <ThreadSnippet thread={thread}
                               errors={this.state.errors}
                               signers={this.state.signers}
                               plaintexts={this.state.plaintexts} />
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
