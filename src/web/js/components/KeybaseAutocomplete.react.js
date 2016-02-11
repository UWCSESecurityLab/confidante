'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var ComposeStore = require('../stores/ComposeStore');
var KeybaseCompletion = require('./KeybaseCard.react');

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
  hideCompletions: function(e) {
    this.setState({results: {}});
  },
  resultClicked: function(username) {
    this.setState({ kbto: username });
    this.props.updateParent(username);
    this.hideCompletions();
  },
  updateKBTo: function(e) {
    let newValue = e.target.value;
    this.setState({ kbto: newValue });
    keybaseAPI.autocomplete(newValue).then(function(body) {
      this.setState({ results: JSON.parse(body) });
      this.props.updateParent(newValue);
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
