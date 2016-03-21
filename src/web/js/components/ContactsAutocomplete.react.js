'use strict';

var React = require('react');
var AutocompleteStore = require('../stores/AutocompleteStore');
var ComposeStore = require('../stores/ComposeStore');
var ContactCompletion = require('./ContactCompletion.react');
var InboxActions = require('../actions/InboxActions');
var Typeahead = require('@tappleby/react-typeahead-component');

var ContactsAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      completions: AutocompleteStore.getContacts(),
      to: this.props.to,
      results: []
    };
  },

  componentDidMount: function() {
    AutocompleteStore.addContactsListener(this.handleNewCompletions);
  },

  // Handles when new Autocomplete results become available.
  handleNewCompletions: function() {
    this.setState({ completions: AutocompleteStore.getContacts() });
  },

  // Handles when the user selects an autocomplete result.
  handleResultSelected: function(event, contact) {
    let updated = this.replaceLastUncompletedWithContact(this.state.to, contact);
    this.updateTo(updated);
  },

  // Handles when the user scrolls through autocomplete results with arrow keys.
  handleResultScroll: function(event, contact, index) {
    if (index == -1) {
      return;
    }

    // Remove the trailing comma if it is the last non whitespace character,
    // because we want to replace the last full completion with a new one.
    let input;
    let trim = this.state.to.trim();
    if (trim.endsWith(',')) {
      input = trim.slice(0, trim.length - 1);
    } else {
      input = this.state.to;
    }

    let updated = this.replaceLastUncompletedWithContact(input, contact);
    this.updateTo(updated);
  },

  // Handles when the input element in the Typeahead component changes
  // (when the user types something)
  handleValueChanged: function(event) {
    let to = event.target.value;
    this.updateTo(to);
    InboxActions.getContacts(to.split(',').pop().trim());
  },

  /**
   * When the user has typed a partial contact, and then selects a completion,
   * this function computes how to replace the partial contact with the
   * selected contact, while retaining the previous comma separated contacts.
   * @param inputValue The value the user has typed in
   * @param contact The contact to insert
   */
  replaceLastUncompletedWithContact: function(inputValue, contact) {
    // Format the email address so it can be added to the "To:" field
    let contactAddr = '';
    if (contact.name.length != 0) {
      // If the contact includes a name, wrap the email address in "< >"
      contactAddr = contact.name + ' <' + contact.email + '>, ';
    } else {
      // Otherwise just use the email address
      contactAddr = contact.email + ', ';
    }

    // Figure out how to append the new contact.
    let updated = '';
    if (inputValue.lastIndexOf(',') == -1) {
      // If there are no complete emails in the field, replace all content with
      // the autocomplete result.
      updated = contactAddr;
    } else {
      // Otherwise replace all content after the comma with the autocomplete
      // result.
      updated = inputValue.slice(0, inputValue.lastIndexOf(',') + 1) + ' ' + contactAddr;
    }

    return updated;
  },

  // Updates the to field's state in this component and the parent.
  updateTo: function(updatedTo) {
    this.setState({ to: updatedTo });
    this.props.updateParent(updatedTo);
  },

  render: function() {
    return <Typeahead inputValue={this.state.to}
                      onChange={this.handleValueChanged}
                      onOptionChange={this.handleResultScroll}
                      onOptionClick={this.handleResultSelected}
                      options={this.state.completions}
                      optionTemplate={ContactCompletion} />
  }
});

module.exports = ContactsAutocomplete;
