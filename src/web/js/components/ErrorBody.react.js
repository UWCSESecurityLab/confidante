'use strict';
var React = require('react');
var messageParsing = require('../messageParsing');

/**
 * The body of a Message when some error has occurred, like a decryption failure.
 */
var ErrorBody = React.createClass({
  propTypes: {
    error: React.PropTypes.instanceOf(Error),
    message: React.PropTypes.object
  },

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
