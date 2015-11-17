'use strict';

var React = require('react');
var request = require('request');
var keybaseAPI = require('../keybaseAPI');

function autocompleteContacts(query) {
  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      url: window.location.origin + '/contacts.json',
      qs: {
        q: query
      }
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error);
      }
    });
  });
}

var ContactsAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      to: '',
      results: []
    };
  },

  hideCompletions: function() {
    this.setState({ results: [] });
  },

  resultClicked: function(contact) {
    let contactAddr = '';
    if (contact.name.length != 0) {
      contactAddr = contact.name + ' <' + contact.email + '>, ';
    } else {
      contactAddr = contact.email + ', ';
    }

    let updated = '';
    if (this.state.to.lastIndexOf(',') == -1) {
      updated = contactAddr;
    } else {
      updated = this.state.to.slice(0, this.state.to.lastIndexOf(',') + 1) + ' ' + contactAddr;
    }

    this.setState({ to: updated });
    this.props.updateParent(this.state.to);
    this.hideCompletions();
  },

  updateTo: function(e) {
    let newString = e.target.value;
    this.setState({ to: newString });
    let query = newString.slice(newString.lastIndexOf(',') + 1);
    autocompleteContacts(query).then(function(results) {
      this.setState({ results: results});
      this.props.updateParent(e.target.value);
    }.bind(this));
  },

  render: function() {
    return (
      <div onMouseLeave={this.hideCompletions}>
        <input type="text"
               value={this.state.to}
               name="to"
               onChange={this.updateTo}
               className="form-control"></input>
        <ul className="autocompletions">
          { this.state.results.length != 0 ?
            this.state.results.map(function(contact) {
              return (
                <li key={contact.email + contact.name}
                    onClick={this.resultClicked.bind(this, contact)}
                    className="completion">
                  { contact.name.length != 0 ?
                    <span id="name">{ contact.name } - </span> : null }
                  <span id="email">{ contact.email }</span>
                </li>
              );
            }.bind(this)) : null }
        </ul>
      </div>
    )
  }
});

module.exports = ContactsAutocomplete;
