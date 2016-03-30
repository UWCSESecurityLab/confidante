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
    AutocompleteStore.addSendListener(this.forceAddContact);
  },

  componentWillReceiveProps: function(props) {
    this.setState({ selected: this.parseContacts(props.to)});
  },

  // When the send button is clicked, we need to force-tokenize the last contact.
  forceAddContact: function(callback) {
    let contacts = this.parseContacts(this.state.to);
    if (contacts.length > 0) {
      this.addContactAndUpdate(contacts[0]);
    }
    callback();
  },

  // Get the latest values from the AutocompleteStore and store it in state.
  handleNewCompletions: function() {
    this.setState({ completions: AutocompleteStore.getContacts() });
  },

  // When a user selects an autocomplete result, add the email to selected.
  handleResultSelected: function(event, contact) {
    this.addContactAndUpdate(contact);
  },

  // When the user scrolls through autocompletions, change the input value to
  // the highlighted email address.
  handleResultScroll: function(event, contact, index) {
    if (index == -1) {
      return;
    }
    this.setState({ to: this.formatContact(contact) });
  },

  // When the user types something, make it a token if it ends in a comma.
  // Otherwise keep the input value updated.
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
    if (this.state.selected.some(recipient => recipient.email == contact.email)) {
      return;
    }
    let updated = this.state.selected.slice(); // Copy selected before modifying
    updated.push(contact);
    this.setState({ selected: updated, to: '' });
    this.props.updateParent(updated.map(this.formatContact).join(', '));
  },

  // Remove the given contact from the selected contacts (if it exists)
  deleteContact: function(contact) {
    let idx = this.state.selected.findIndex(function(selected) {
      return selected.name == contact.name && selected.email == contact.email;
    });
    if (idx == -1) {
      return;
    }
    let updated = this.state.selected.slice(); // Copy selected before modifying
    updated.splice(idx, 1);
    this.setState({ selected: updated });
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
    return addresses.filter(function(address) {
      // First, filter out invalid email addresses.
      return address.user() !== null && address.host() !== null;
    }).map(function(address) {
      // Then format it in the simple format we like.
      return { email: address.address, name: address.name() }
    });
  },

  render: function() {
    let selected = this.state.selected.map(function(contact) {
      return (
        <li className="contact-token" key={contact.email}>
          { contact.name
            ? <span title={contact.email}>{contact.name}</span>
            : <span>{contact.email}</span>
          }
          <button type="button"
                  className="close delete-contact"
                  onClick={this.deleteContact.bind(this, contact)}>
            &times;
          </button>
        </li>
      );
    }.bind(this));

    return (
      <ul className="autocomplete-input">
          {selected}
          <Typeahead inputValue={this.state.to}
                     onChange={this.handleValueChanged}
                     onOptionChange={this.handleResultScroll}
                     onOptionClick={this.handleResultSelected}
                     options={this.state.completions}
                     optionTemplate={ContactCompletion} />
      </ul>
    );
  }
});

module.exports = ContactsAutocomplete;
