'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');

var KeybaseAutocomplete = React.createClass({
  getInitialState: function() {
    return {
      kbto: '',
      results: {}
    };
  },
  hideCompletions: function() {
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
      <div>
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
                 <KeybaseCompletion key={username}
                    onClick={this.resultClicked.bind(this, username)}
                    components={completion.components} />
              );
            }.bind(this)) : null }
        </ul>
      </div>
    );
  }
});

var KeybaseCompletion = React.createClass({
  render: function() {
    let components = this.props.components;
    return (
      <li onClick={this.props.onClick} className="completion">
        { components.full_name ?
          <strong>{ components.full_name.val } </strong>
          : null }

        <a href={'https://keybase.io/' + components.username.val} target="_blank">
          <span>{ components.username.val } </span>
        </a>

        { components.twitter ?
          <a href={'https://twitter.com/' + components.twitter.val} target="_blank">
            <span>@{ components.twitter.val } </span>
          </a> : null }

        { components.github ?
          <a href={'https://github.com/' + components.github.val} target="_blank">
          <span>{ components.github.val } </span>
          </a> : null }
      </li>
    );
  }
});

module.exports = KeybaseAutocomplete;
