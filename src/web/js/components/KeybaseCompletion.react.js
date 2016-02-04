'use strict';

var React = require('react');

var KeybaseCompletion = React.createClass({
  render: function() {
    let user = this.props.user;
    return (
      <div onClick={user.onClick} className="completion">
        { user.full_name ?
          <strong>{ user.full_name } </strong>
          : null }

        <a href={'https://keybase.io/' + user.username} target="_blank">
          <span>{ user.username } </span>
        </a>

        { user.twitter ?
          <a href={'https://twitter.com/' + user.twitter} target="_blank">
            <span>@{ user.twitter } </span>
          </a> : null }

        { user.github ?
          <a href={'https://github.com/' + user.github} target="_blank">
          <span>{ user.github } </span>
          </a> : null }
      </div>
    );
  }
});

module.exports = KeybaseCompletion;
