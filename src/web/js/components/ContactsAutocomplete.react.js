'use strict';

const React = require('react');
const addrs = require('email-addresses');
const AutocompleteStore = require('../stores/AutocompleteStore');
const ContactCompletion = require('./ContactCompletion.react');
const InboxActions = require('../actions/InboxActions');
const Typeahead = require('@tappleby/react-typeahead-component');

var ContactsAutocomplete = React.createClass({
  propTypes: {
    updateParent: React.PropTypes.func
  },

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

  /**
   * When the send button is clicked, we need to force-tokenize the last contact.
   * @param onSuccess calls send() or sendInvite() in ComposeArea.
   * @param onError calls setBadEmailAddress() in ComposeArea
   */
  forceAddContact: function(onSuccess, onError) {
    let to = this.state.to.trim();
    if (to.length == 0) {
      onSuccess();
      return;
    }

    let contacts = this.parseContacts(to);
    if (contacts.length > 0) {
      this.addContactAndUpdate(contacts[0], onSuccess);
    } else {
      onError(this.state.to);
    }
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
  // Optionally, pass a callback to be run after the state has been updated.
  addContactAndUpdate: function(contact, callback) {
    if (this.state.selected.some(recipient => recipient.email == contact.email)) {
      return;
    }
    let updated = this.state.selected.slice(); // Copy selected before modifying
    updated.push(contact);

    let updateSelf = new Promise(function(resolve) {
      this.setState({ selected: updated, to: '' }, resolve);
    }.bind(this));
    let updateParent = new Promise(function(resolve) {
      this.props.updateParent(updated.map(this.formatContact).join(', '), resolve);
    }.bind(this));

    Promise.all([updateSelf, updateParent]).then(function() {
      if (callback) {
        callback();
      }
    });
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
    if (contact.name && contact.name.length !== 0) {
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
    if (string === '') {
      return [];
    }
    let addresses = string.split(',');
    return addresses
      .map((str) => str.trim())
      .map(addrs.parseOneAddress)
      .filter((result) => result != null)
      .map(function(address) {
        return { email: address.address, name: address.name };
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
          <span className="glyphicon glyphicon-envelope autocomplete-icon"
                aria-label="To">
          </span>
          {selected}
          <Typeahead inputValue={this.state.to}
                     placeholder="To (insert as comma-separated list)"
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
