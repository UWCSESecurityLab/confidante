'use strict';

var React = require('react');
var request =  require('request');
var ThreadSnippet = require('./ThreadSnippet.react');

/**
 * An Inbox represent's the user's encrypted inbox, consisting of a list
 * of ThreadSnippets.
 */
var Inbox = React.createClass({
  getInitialState: function() {
    return {
      threads: [],
      listname: 'Inbox',
    }
  },

  loadMail: function() {
    request(
      { method: 'GET',
        url: 'http://localhost:3000/inbox'
      },
      function(error, response, body) {
        if (!error) {
          body = JSON.parse(body);
          this.setState({threads: body});
        }
      }.bind(this));
  },

  componentDidMount: function() {
    this.loadMail();
    setInterval(this.loadMail, 5000);
  },

  render: function() {
    var snippets = this.state.threads.map(function(thread) {
      return <li key={thread.id}> <ThreadSnippet thread={thread}/> </li>
    });
    if (snippets.length == 0) {
      return (
        <div>
          <h1> {this.state.listname} </h1>
          <div className="row snippet">No encrypted emails!</div>
        </div>
      )
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
