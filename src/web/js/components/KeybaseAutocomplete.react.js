'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');
var ComposeStore = require('../stores/ComposeStore');
var KeybaseCompletion = require('./KeybaseCompletion.react');

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
    this.setState({ kbto: e.target.value });
    keybaseAPI.autocomplete(this.state.kbto).then(function(body) {
      this.setState({ results: JSON.parse(body) });
      this.props.updateParent(e.target.value);
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
              var username = completion.components.username.val;
              return (
                 <li key={username}>
                   <KeybaseCompletion 
                   onClick={this.resultClicked.bind(this, username)}
                    components={completion.components} />
                 </li>
              );
            }.bind(this)) : null }
        </ul>
      </div>
    );
  }
});

module.exports = KeybaseAutocomplete;
