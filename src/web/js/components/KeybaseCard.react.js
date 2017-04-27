'use strict';
const flags = require('../../../flags');
const KeybaseAPI = require('../keybaseAPI');
const openLink = require('../openLink');
const React = require('react');

let KeybaseCompletion = React.createClass({
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
            <a className="btn btn-warning keybase-btn"
               role="button"
               target="_blank"
               href={ KeybaseAPI.url() + '/' + user.username }
               onClick={openLink}>
              Keybase Profile
            </a>
          </div>
          <div className="accounts-line">
            { user.twitter ?
              <span className="line-item">
                <img src={flags.ELECTRON ? '../img/twitter.png' : 'twitter.png'} height="24px"/>
                <a href={'https://twitter.com/' + user.twitter}
                   target="_blank"
                   onClick={openLink}>
                  @{user.twitter}
                </a>
              </span> : null }

            { user.github ?
              <span className="line-item">
                <img src={flags.ELECTRON ? '../img/github.png' : 'github.png'}
                     className="github-img"
                     height="16px"/>
                <a href={'https://github.com/' + user.github}
                   target="_blank"
                   onClick={openLink}>
                  {user.github}
                </a>
              </span> : null }
          </div>
        </div>
      </div>
    );
  }
});

module.exports = KeybaseCompletion;
