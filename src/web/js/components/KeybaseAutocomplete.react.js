'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var ComposeStore = require('../stores/ComposeStore');
/* eslint-disable no-unused-vars */
var KeybaseCompletion = require('./KeybaseCard.react');
/* eslint-enable no-unused-vars */

var KeybaseAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      kbto: '',
      results: {}
    };
  },
  componentDidMount: function() {
    ComposeStore.addResetListener(this._onReset);
  },
  _onReset: function() {
    this.setState(this.getInitialState());
  },
  hideCompletions: function() {
    this.setState({ results: {} });
  },
  resultClicked: function(username) {
    // Figure out how to append the new keybase username.
    let updated = '';
    if (this.state.kbto.lastIndexOf(',') == -1) {
      // If there are no complete usernames in the field, replace all content
      // with the autocomplete result.
      updated = username + ', ';
    } else {
      // Otherwise replace all content after the comma with the autocomplete
      // result.
      updated = this.state.kbto.slice(0, this.state.kbto.lastIndexOf(',') + 1) + ' ' + username + ', '
    }

    this.setState({ kbto: updated });
    this.props.updateParent(updated);
    this.hideCompletions();
  },
  updateKBTo: function(e) {
    let newString = e.target.value;
    this.setState({ kbto: newString });
    let query = newString.slice(newString.lastIndexOf(',') + 1).trim();
    if (query.length == 0) {
      return;
    }
    keybaseAPI.autocomplete(query).then(function(body) {
      this.setState({ results: body });
      this.props.updateParent(newString);
    }.bind(this));
  },

  render: function() {
    return (
      <div onMouseLeave={this.hideCompletions}>
        <input type="text"
               value={this.state.kbto}
               name="kbto"
               onChange={this.updateKBTo}
               className="form-control"></input>
        <ul className="autocompletions">
          { this.state.results.completions ?
            this.state.results.completions.map(function(completion) {
              // Parse the autocomplete profile into a simpler object
              // representing the user and their attributes.
              let user = {};
              for (var component in completion.components) {
                if (completion.components.hasOwnProperty(component) &&
                    component != 'websites') {
                  user[component] = completion.components[component].val;
                }
              }
              user.picture = completion.thumbnail;
              return (
                <li key={ user.username }>
                  <KeybaseCompletion
                    onClick={this.resultClicked.bind(this, user.username)}
                    user={user}/>
                </li>
              );
            }.bind(this)) : null }
        </ul>
      </div>
    );
  }
});

module.exports = KeybaseAutocomplete;
