'use strict';

var React = require('react');
var AddressParser = require('address-rfc2822');
var AutocompleteStore = require('../stores/AutocompleteStore');
var ComposeStore = require('../stores/ComposeStore');
var ContactCompletion = require('./ContactCompletion.react');
var InboxActions = require('../actions/InboxActions');
var Typeahead = require('@tappleby/react-typeahead-component');

var ContactsAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      completions: AutocompleteStore.getContacts(), // Autocomplete results
      to: '',  // Current value of the input field
      selected: []  // List of objects representing selected recipients
    };
  },

  componentDidMount: function() {
    AutocompleteStore.addContactsListener(this.handleNewCompletions);
  },

  componentWillReceiveProps: function(props) {
    this.setState({ selected: this.parseContacts(props.to)});
  },

  // Handles when new Autocomplete results become available.
  handleNewCompletions: function() {
    this.setState({ completions: AutocompleteStore.getContacts() });
  },

  // Handles when the user selects an autocomplete result.
  handleResultSelected: function(event, contact) {
    this.addContactAndUpdate(contact);
  },

  // Handles when the user scrolls through autocomplete results with arrow keys.
  handleResultScroll: function(event, contact, index) {
    if (index == -1) {
      return;
    }
    this.setState({ to: this.formatContact(contact) });
  },

  // Handles when the input element in the Typeahead component changes
  // (when the user types something)
  handleValueChanged: function(event) {
    let to = event.target.value;
    if (to.endsWith(',')) {
      // Attempt to parse the input into an email contact
      let contacts = this.parseContacts(to);
      if (contacts.length == 1) {
        this.addContactAndUpdate(contacts[0]);
        return;
      }
    }
    // If not an email address, update the input field and get more
    // autocompletions.
    this.setState({ to: to });
    InboxActions.getContacts(to);
  },

  // Add the contact to the selected contacts (component state), update the
  // parent, and clear the input element.
  addContactAndUpdate: function(contact) {
    // Copy state.selected before appending new contact
    let updated = this.state.selected.slice();
    updated.push(contact);
    this.setState({ selected: updated, to: '' });
    this.props.updateParent(updated.map(this.formatContact).join(', '));
  },

  // Converts a JSON email contact to a RFC compliant string
  formatContact: function(contact) {
    let contactAddr = '';
    if (contact.name.length != 0) {
      // If the contact includes a name, wrap the email address in "< >"
      contactAddr = contact.name + ' <' + contact.email + '>';
    } else {
      // Otherwise just use the email address
      contactAddr = contact.email;
    }
    return contactAddr;
  },

  // Converts an RFC string of addresses into JSON email contacts
  parseContacts: function(string) {
    let addresses = AddressParser.parse(string);
    return addresses.map(function(address) {
      return { email: address.address, name: address.name() }
    });
  },

  render: function() {
    let selected = this.state.selected.map(function(contact) {
      return (
        <li className="contact-token" key={contact.email}>
          { contact.name
            ? <span>{contact.name}</span>
            : <span>{contact.email}</span>
          }
          <button type="button" className="close threadClose">&times;</button>
        </li>
      );
    });

    return (
      <div className="autocomplete-input">
        <ul className="contact-tokens">
          {selected}
        </ul>
        <Typeahead inputValue={this.state.to}
                   onChange={this.handleValueChanged}
                   onOptionChange={this.handleResultScroll}
                   onOptionClick={this.handleResultSelected}
                   options={this.state.completions}
                   optionTemplate={ContactCompletion} />
      </div>
    );
  }
});

module.exports = ContactsAutocomplete;
