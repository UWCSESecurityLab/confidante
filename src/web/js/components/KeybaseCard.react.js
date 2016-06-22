'use strict';

var React = require('react');
var KeybaseAPI = require('../keybaseAPI');

var KeybaseCompletion = React.createClass({
  propTypes: {
    data: React.PropTypes.object,
    isSelected: React.PropTypes.bool,
    onClick: React.PropTypes.func
  },

  render: function() {
    let user = this.props.data;

    let className = 'keybase-card';
    if (this.props.isSelected) {
      className += ' keybase-card-selected';
    }

    return (
      <div className={className} onClick={this.props.onClick}>
        { user.picture
          ? <div className="pic-section">
              <img className="profile-pic" src={ user.picture }></img>
            </div>
          : null }
        <div className="text-section">
          <div className="name-line">
            <h4 className="line-item">{ user.full_name ? user.full_name : user.username}</h4>
            <a className="btn btn-warning keybase-btn" role="button" target="_blank"
               href={ KeybaseAPI.url() + '/' + user.username }>
              Keybase Profile
            </a>
          </div>
          <div className="accounts-line">
            { user.twitter ?
              <span className="line-item">
                <img src="twitter.png" height="24px"></img>
                <a href={'https://twitter.com/' + user.twitter} target="_blank">
                  <span>@{ user.twitter } </span>
                </a>
              </span> : null }

            { user.github ?
              <span className="line-item">
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
