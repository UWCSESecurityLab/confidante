'use strict';

// Disable no-unused-vars since linter can't catch references that are only used in JSX.
/*eslint-disable no-unused-vars*/
var React = require('react');
/*eslint-enable no-unused-vars*/

var messageParsing = require('../messageParsing');

/**
 * The body of a Message when some error has occurred, like a decryption failure.
 */
var ErrorBody = React.createClass({
  getInitialState: function() {
    return {
      hover: false
    };
  },
  onMouseOver: function() {
    this.setState( {hover: true} );
  },
  onMouseOut: function() {
    this.setState( {hover: false} );
  },
  render: function() {
    var text;
    if (this.state.hover) {
      text = messageParsing.getMessageBody(this.props.message);
    } else {
      text = this.props.error.toString();
    }
    
    return (
      <div className="alert alert-danger" onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
        {text}
      </div>
    );
  }
});

module.exports = ErrorBody;
