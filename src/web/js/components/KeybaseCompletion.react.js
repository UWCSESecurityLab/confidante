'use strict'; 

var React = require('react');

var KeybaseCompletion = React.createClass({
  render: function() {
    let components = this.props.components;
    return (
      <div onClick={this.props.onClick} className="completion">
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
      </div>
    );
  }
});

module.exports = KeybaseCompletion;
