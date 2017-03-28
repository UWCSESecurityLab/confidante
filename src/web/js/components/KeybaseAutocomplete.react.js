'use strict';

var React = require('react');
var AutocompleteStore = require('../stores/AutocompleteStore');
var InboxActions = require('../actions/InboxActions');
var KeybaseCard = require('./KeybaseCard.react');
var Typeahead = require('@tappleby/react-typeahead-component');

var KeybaseAutocomplete = React.createClass({
  propTypes: {
    updateParent: React.PropTypes.func
  },

  getInitialState: function() {
    return {
      completions: AutocompleteStore.getKeybase(),
      kbto: '',     // Current Keybase username being typed
      selected: []  // Array of selected Keybase usernames
    };
  },

  componentDidMount: function() {
    AutocompleteStore.addKeybaseListener(this.handleNewCompletions);
  },

  componentWillReceiveProps: function(props) {
    this.setState({ selected: props.kbto });
  },

  // When the user navigates away from the input box, make it into a token.
  handleFocusLost: function(event) {
    let kbto = event.target.value.trim();
    // Make sure it's a real username first.
    if (this.state.completions.some(completion => completion.username == kbto)) {
      this.addUsernameAndUpdate(kbto);
    }
  },

  // Get the latest values from the AutocompleteStore and store it in state.
  handleNewCompletions: function() {
    this.setState({ completions: AutocompleteStore.getKeybase() });
  },

  // When a user selects an autocomplete result, add the username to selected.
  handleResultSelected: function(event, keybase) {
    this.addUsernameAndUpdate(keybase.username);
  },

  // When the user scrolls through autocompletions, change the input value to
  // the highlighted username.
  handleResultScroll: function(event, keybase, index) {
    if (index == -1) {
      return;
    }
    this.setState({ kbto: keybase.username });
  },

  // When the user types something, make it a token if it ends in a comma.
  // Otherwise keep the input value updated.
  handleValueChanged: function(event) {
    let kbto = event.target.value;
    if (kbto.endsWith(',')) {
      this.addUsernameAndUpdate(kbto.slice(0, kbto.length - 1));
    } else {
      this.setState({ kbto: kbto });
    }
    InboxActions.getKeybase(kbto);
  },

  // Add the username to the array of selected usernames, update the parent, and
  // clear the input element.
  addUsernameAndUpdate: function(username) {
    if (this.state.selected.includes(username)) {
      return;
    }
    let updated = this.state.selected.slice(); // Copy selected before modifying
    updated.push(username);
    this.setState({ selected: updated, kbto: '' });
    this.props.updateParent(updated);
  },

  // Remove the given username from the component state, and update the parent.
  deleteUsername: function(username) {
    let idx = this.state.selected.indexOf(username);
    if (idx == -1) {
      return;
    }
    let updated = this.state.selected.slice(); // Copy selected before modifying
    updated.splice(idx, 1);
    this.setState({ selected: updated });
    this.props.updateParent(updated);
  },

  render: function() {
    let selected = this.state.selected.map(function(username) {
      return (
        <li className="contact-token" key={username}>
          {username}
          <button type="button"
                  className="close delete-contact"
                  onClick={this.deleteUsername.bind(this, username)}>
            &times;
          </button>
        </li>
      );
    }.bind(this));

    return (
      <ul className="autocomplete-input">
        <span className="glyphicon glyphicon-lock autocomplete-icon"
              aria-label="Keybase Username">
        </span>
        {selected}
        <Typeahead inputValue={this.state.kbto}
                   placeholder="Search for people on Keybase"
                   onBlur={this.handleFocusLost}
                   onChange={this.handleValueChanged}
                   onOptionChange={this.handleResultScroll}
                   onOptionClick={this.handleResultSelected}
                   options={this.state.completions}
                   optionTemplate={KeybaseCard} />
      </ul>
    );
  }
});

module.exports = KeybaseAutocomplete;
