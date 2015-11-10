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
  render: function() {
    var renderedResults = [];
    console.log('Current results: ');
    console.log(this.state.results.completions);
    if (this.state.results.completions) {
      console.log('Yes we have completions, we should render them');
      renderedResults = this.state.results.completions.map(function(result) {
        return (
          <li>
            <p><strong>{result.components.full_name.val}</strong> {result.components.username.val}</p>
          </li>
        )
      });
    }
    console.log(renderedResults);

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
