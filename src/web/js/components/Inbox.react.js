'use strict';

var React = require('react');
var ThreadSnippet = require('./ThreadSnippet.react');
var MessageStore = require('../stores/MessageStore');

/**
 * An Inbox represent's the user's encrypted inbox, consisting of a list
 * of ThreadSnippets.
 */
var Inbox = React.createClass({
  getInitialState: function() {
    return {
      threads: [],
      listname: 'Inbox'
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
                               plaintexts={this.state.plaintexts} />
              </li>);
    }.bind(this));
    if (snippets.length == 0) {
      return (
        <div>
          <h1> {this.state.listname} </h1>
          <div className="row snippet">No encrypted emails!</div>
        </div>
      );
    }
    return (
      <div>
        <h1> {this.state.listname} </h1>
        <ul>
          {snippets}
        </ul>
      </div>
    );
  }
});

module.exports = Inbox;
