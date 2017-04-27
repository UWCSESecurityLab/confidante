'use strict';
const flags = require('../../../flags.js');
const InboxActions = require('../actions/InboxActions');
const MessageStore = require('../stores/MessageStore.js');
const openLink = require('../openLink');
const React = require('react');
const semver = require('semver');
const version = require('../../../../package.json').version;

let Header = React.createClass({
  propTypes: {
    email: React.PropTypes.string,
    mailbox: React.PropTypes.string,
    staging: React.PropTypes.bool,
    toolname: React.PropTypes.string
  },

  render: function() {
    let outOfDate = false;
    if (flags.ELECTRON) {
      let latestVersion = MessageStore.getLatestVersionNumber();
      if (semver.valid(version) && semver.valid(latestVersion)) {
        outOfDate = semver.lt(version, latestVersion);
      }
    }
    return (
      <nav className="navbar navbar-default">
        <div className="container-fluid">
          <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand" href={flags.ELECTRON ? './mail.ejs' : '/mail'}>
              <img id="navbar-logo" src={flags.ELECTRON ? '../img/logo-transparent-no-text.png' : 'logo-transparent-no-text.png'}/>
              {this.props.toolname}
              { this.props.staging ? <sub id="staging"> Staging</sub> : null }
            </a>
          </div>
          <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
            <ul className="nav navbar-nav">
              <li className={this.props.mailbox == 'INBOX' ? 'active' : null}
                  onClick={InboxActions.changeMailbox.bind(this, 'INBOX')}>
                <a href="#">Inbox</a>
              </li>
              <li className={this.props.mailbox == 'SENT' ? 'active' : null}
                  onClick={InboxActions.changeMailbox.bind(this, 'SENT')}>
                <a href="#">Sent Mail</a>
              </li>
              <li className={this.props.mailbox == '' ? 'active' : null}
                  onClick={InboxActions.changeMailbox.bind(this, '')}>
                <a href="#">All Mail</a>
              </li>
              { outOfDate ? <li><a id="updateLink" onClick={openLink} href="https://confidante.cs.washington.edu#download">Update Confidante</a></li> : null}
            </ul>
            <ul className="nav navbar-nav navbar-right">
              <li>
                <a href="https://catalyst.uw.edu/umail/form/franzi/4766" onClick={openLink} target="_blank">Feedback</a>
              </li>
              <li><a id="myEmail">{this.props.email}</a></li>
              <li onClick={InboxActions.logout}><a href="#">Log Out</a></li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

module.exports = Header;
