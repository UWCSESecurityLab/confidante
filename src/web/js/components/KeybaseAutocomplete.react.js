'use strict';

var React = require('react');
var AutocompleteStore = require('../stores/AutocompleteStore');
var InboxActions = require('../actions/InboxActions');
var KeybaseAPI = require('../keybaseAPI');
var KeybaseCard = require('./KeybaseCard.react');
var Typeahead = require('@tappleby/react-typeahead-component');

var KeybaseAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      completions: AutocompleteStore.getKeybase(),
      kbto: '',
      results: {}
    };
  },

  componentDidMount: function() {
    AutocompleteStore.addKeybaseListener(this.handleNewCompletions);
  },

  componentWillReceiveProps: function(props) {
    this.setState({ kbto: props.kbto });
  },

  // Handles when new Autocomplete results become available.
  handleNewCompletions: function() {
    this.setState({ completions: AutocompleteStore.getKeybase() });
  },

  // Handles when the user selects an autocomplete result.
  handleResultSelected: function(event, keybase) {
    console.log(keybase);
    let updated = this.replaceLastUncompletedWithKeybase(this.state.kbto, keybase.username);
    this.updateKBTo(updated);
  },

  // Handles when the user scrolls through autocomplete results with arrow keys.
  handleResultScroll: function(event, keybase, index) {
    if (index == -1) {
      return;
    }

    // Remove the trailing comma if it is the last non whitespace character,
    // because we want to replace the last full completion with a new one.
    let input;
    let trim = this.state.kbto.trim();
    if (trim.endsWith(',')) {
      input = trim.slice(0, trim.length - 1);
    } else {
      input = this.state.kbto;
    }
    let updated = this.replaceLastUncompletedWithKeybase(input, keybase.username);
    this.updateKBTo(updated);
  },

  handleValueChanged: function(event) {
    let kbto = event.target.value;
    this.updateKBTo(kbto);
    let trailing = kbto.split(',').pop().trim();
    if (trailing.length > 1) {
      InboxActions.getKeybase(trailing);
    }
  },

  /**
   * When the user has typed a partial value, and then selects a completion,
   * this function computes how to replace the partial value with the
   * selected username, while retaining the previous comma separated usernames.
   * @param inputValue The value the user has typed in
   * @param contact The contact to insert
   */
  replaceLastUncompletedWithKeybase: function(inputValue, username) {
    // Figure out how to append the new keybase username.
    let updated = '';
    if (inputValue.lastIndexOf(',') == -1) {
      // If there are no complete usernames in the field, replace all content
      // with the autocomplete result.
      updated = username + ', ';
    } else {
      // Otherwise replace all content after the comma with the autocomplete
      // result.
      updated = inputValue.slice(0, inputValue.lastIndexOf(',') + 1) + ' ' + username + ', '
    }
    return updated;
  },

  updateKBTo: function(updatedKBTo) {
    this.setState({ kbto: updatedKBTo});
    this.props.updateParent(updatedKBTo);
  },

  render: function() {
    return <Typeahead inputValue={this.state.kbto}
                      onChange={this.handleValueChanged}
                      onOptionChange={this.handleResultScroll}
                      onOptionClick={this.handleResultSelected}
                      options={this.state.completions}
                      optionTemplate={KeybaseCard} />
  }
});

module.exports = KeybaseAutocomplete;
