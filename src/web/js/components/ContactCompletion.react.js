'use strict';
var React = require('react');


var ContactCompletion = React.createClass({
  render: function() {
    return (
      <div>{this.props.data.name} {this.props.data.value}</div>
    );
  }
});

module.exports = ContactCompletion;
