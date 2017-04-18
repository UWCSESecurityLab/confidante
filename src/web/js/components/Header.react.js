'use strict';
const flags = require('../../../flags.js');
const InboxActions = require('../actions/InboxActions');
const React = require('react');

let Header = React.createClass({
  propTypes: {
    email: React.PropTypes.string,
    mailbox: React.PropTypes.string,
    staging: React.PropTypes.bool,
    toolname: React.PropTypes.string
  },

  render: function() {
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
            </ul>
            <ul className="nav navbar-nav navbar-right">
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
