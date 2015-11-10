'use strict';

var React = require('react');
var keybaseAPI = require('../keybaseAPI');

var Autocomplete = React.createClass({
  getInitialState: function() {
    return {
      kbto: '',
      results: {}
    };
  },
  updateKBTo: function(e) {
    this.setState({ kbto: e.target.value });
    keybaseAPI.autocomplete(this.state.kbto).then(function(body) {
      this.setState({ results: JSON.parse(body) });
    }.bind(this));
  },
  resultClicked: function(e) {
    console.log(e);
    this.setState({ kbto: e.target.innerText });
    this.setState({ results: {} });
  },
  render: function() {
    var renderedResults = [];
    if (this.state.results.completions) {
      renderedResults = this.state.results.completions.map(function(result) {
        return (
          <li key={result.components.username.val} onClick={this.resultClicked}>
            {result.components.username.val}
          </li>
        );
      }.bind(this));
    }

    return (
      <div>
        <div className="form-group">
          <label htmlFor="kbto">Keybase ID of Recipient:</label>
          <input type="text" value={this.state.kbto} name="kbto" onChange={this.updateKBTo} className="form-control"></input>
        </div>
        <ul>
          {renderedResults}
        </ul>
      </div>
    );
  }
});

module.exports = Autocomplete;
