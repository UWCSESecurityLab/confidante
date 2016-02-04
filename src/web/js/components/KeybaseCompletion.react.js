'use strict';

var React = require('react');

var KeybaseCompletion = React.createClass({
  render: function() {
    let user = this.props.user;
    return (
      <div className="keybase-card row" onClick={this.props.onClick}>
        <div className="pic-section">
          <img className="profile-pic" src={ user.picture }></img>
        </div>
        <div className="text-section">
          <div className="top-line">
            <h4>{ user.full_name ? user.full_name : user.username}</h4>
            <a className="btn btn-warning keybase-btn" href={ 'https://keybase.io/' + user.username } role="button">
              View profile on Keybase
            </a>
          </div>
          <div className="bottom-line">
            { user.twitter ?
              <span className="linked-account">
                <img src="twitter.png" height="24px"></img>
                <a href={'https://twitter.com/' + user.twitter} target="_blank">
                  <span>@{ user.twitter } </span>
                </a>
              </span> : null }

            { user.github ?
              <span className="linked-account">
                <img src="github.png" className="github-img" height="16px"></img>
                <a href={'https://github.com/' + user.github} target="_blank">
                  <span>{ user.github }</span>
                </a>
              </span> : null }
          </div>
        </div>
      </div>
    );
  }
});

module.exports = KeybaseCompletion;
