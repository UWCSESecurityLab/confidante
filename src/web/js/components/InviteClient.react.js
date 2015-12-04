'use strict';

var React = require('react');
var request = require('request');
var KeybaseAPI = require('../keybaseAPI.js');
var p3skb = require('../../../p3skb.js');

var InviteClient = React.createClass({
  getInitialState: function() {
    return {
      plaintext: '',
      status: '',
      error: ''
    }
  },
  componentDidMount: function() {
    this.setState({ status: 'Fetching message...'});
    request({
      method: 'GET',
      url: window.location.origin + '/invite/viewInvite?id=' + getQuery('id')
    }, function(err, response, body) {
      if (err) {
        this.setState({ error: err });
        return;
      }
      let invite = JSON.parse(body);
      this.setState({ status: 'Decrypting key...' });
      p3skb.p3skbToArmoredPrivateKey(invite.key, getQuery('pw'))
        .then(KeybaseAPI.managerFromPublicKey)
        .then(function(manager) {
          this.setState({ status: 'Decrypting message...' })
          return KeybaseAPI.decrypt(invite.message)(manager);
        }.bind(this))
        .then(function(plaintext) {
          this.setState({ plaintext: plaintext });
        }.bind(this)).catch(function(err) {
          this.setState({ error: err });
        }.bind(this));
    }.bind(this));
  },
  render: function() {
    var body;
    if (this.state.plaintext && this.state.plaintext != '') {
      body = (
        <div className="messageBody">
          {this.state.plaintext}
        </div>
      )
    } else if (this.state.error && this.state.error != '') {
      body = (
        <div className="alert alert-danger">
          {this.state.error}
        </div>
      )
    } else {
      body = (
        <div className="messageBody alert alert-info">
          {this.state.status}
          <span className="glyphicon glyphicon-refresh spinner"></span>
        </div>
      )
    }

    return (
      <div className="row thread">
        <div className="message">
          {body}
          <button type="button" className="btn btn-primary reply" onClick={this.reply}>
            Reply
          </button>
        </div>
      </div>
    )
  }
});

function getQuery(query) {
  let queryIndex = window.location.search.indexOf(query + '=');
  let valueIndex = queryIndex + query.length + 1;
  let endIndex = window.location.search.indexOf('&', valueIndex);
  if (endIndex == -1) {
    endIndex = window.location.search.length;
  }
  return window.location.search.slice(valueIndex, endIndex);
}

module.exports = InviteClient;
