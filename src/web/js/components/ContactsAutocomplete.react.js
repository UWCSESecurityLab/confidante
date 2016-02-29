'use strict';

var React = require('react');
var ComposeStore = require('../stores/ComposeStore');
var xhr = require('xhr');

function autocompleteContacts(query) {
  return new Promise(function(resolve, reject) {
    xhr.get({
      url: window.location.origin + '/contacts.json?q=' + query
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
  componentDidMount: function() {
    ComposeStore.addResetListener(this._onReset);
  },
  _onReset: function() {
    this.setState(this.getInitialState());
  },
  hideCompletions: function() {
    this.setState({ results: [] });
  },
  resultClicked: function(contact) {
    // Format the email address so it can be added to the "To:" field
    let contactAddr = '';
    if (contact.name.length != 0) {
      // If the contact includes a name, wrap the email address in "< >"
      contactAddr = contact.name + ' <' + contact.email + '>, ';
    } else {
      // Otherwise just append a comma
      contactAddr = contact.email + ', ';
    }

    // Figure out how to append the new contact.
    let updated = '';
    if (this.state.to.lastIndexOf(',') == -1) {
      // If there are no complete emails in the field, replace all content with
      // the autocomplete result.
      updated = contactAddr;
    } else {
      // Otherwise replace all content after the comma with the autocomplete
      // result.
      updated = this.state.to.slice(0, this.state.to.lastIndexOf(',') + 1) + ' ' + contactAddr;
    }

    this.setState({ to: updated });
    this.props.updateParent(updated);
    this.hideCompletions();
  },

  updateTo: function(e) {
    let newString = e.target.value;
    this.setState({ to: newString });
    let query = newString.slice(newString.lastIndexOf(',') + 1).trim();
    autocompleteContacts(query).then(function(results) {
      this.setState({ results: results });
      this.props.updateParent(newString);
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
