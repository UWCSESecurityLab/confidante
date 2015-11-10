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
      this.setState({ results: body });
      console.log(this.state.results);
    }.bind(this));
  },
  render: function() {
    return(
      <div className="form-group">
        <label htmlFor="kbto">Keybase ID of Recipient:</label>
        <input type="text" value={this.state.kbto} name="kbto" onChange={this.updateKBTo} className="form-control"></input>
      </div>
    );
  }
});

module.exports = Autocomplete;
