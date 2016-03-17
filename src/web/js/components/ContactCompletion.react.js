'use strict';
var React = require('react');


var ContactCompletion = React.createClass({
  render: function() {
    let contact = this.props.data;

    let className = 'completion';
    if (this.props.isSelected) {
      className += ' completion-selected';
    }

    return (
      <div className={className}>
        { contact.name.length != 0 ?
          <span id="name">{ contact.name } - </span> : null }
          <span id="email">{ contact.email }</span>
      </div>
    );
  }
});

module.exports = ContactCompletion;
