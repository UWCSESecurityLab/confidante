'use strict';

var React = require('react');

var Header = React.createClass({
  getInitialState: function() {
    return {
      currentPage: ''
    }
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
            <a className="navbar-brand" href="/mail">
              Keymail
              { this.props.staging ? <sub id="staging">Staging</sub> : null }
            </a>
          </div>
          <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
            <ul className="nav navbar-nav">
              <li><a href="#">Inbox</a></li>
              <li><a href="#">Sent Mail</a></li>
              <li><a href="#">All Mail</a></li>
              <li><a href="/help" target="_blank">Help</a></li>
            </ul>
            <ul className="nav navbar-nav navbar-right">
              <li><a id="myEmail" href="#">{this.props.email}</a></li>
              <li><a href="/logout">Log Out</a></li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

module.exports = Header;
