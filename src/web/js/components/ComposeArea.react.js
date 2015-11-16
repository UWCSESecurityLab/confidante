'use strict';

var React = require('react');
var ContactsAutocomplete = require('./ContactsAutocomplete.react');
var KeybaseAutocomplete = require('./KeybaseAutocomplete.react');
var InReplyToStore = require('../stores/InReplyToStore');
var messageParsing = require('../messageParsing');
var keybaseAPI = require('../keybaseAPI');
var kbpgp = require('kbpgp');
var request = require('request');

var ourPublicKeyManager =
  Promise
    .reject(new Error('Key manager for local public key not yet created.'))
    .catch(function() {});

(function() {
  try {
    var me = JSON.parse(localStorage.getItem('keybase'))
    var pubkey = me.public_keys.primary.bundle;
    ourPublicKeyManager = keybaseAPI.managerFromPublicKey(pubkey)
  } catch(err) {
    ourPublicKeyManager = Promise.reject(new Error(err));
  }
})();

/**
 * The ComposeArea is the UI for writing a new email, whether a reply
 * or a new thread.
 */
var ComposeArea = React.createClass({
  getInitialState: function() {
    return {
      to: '',
      kbto: '',
      subject: '',
      email: '',
      feedback: '',
      inReplyTo: InReplyToStore.get()
    }
  },
  updateTo: function(to) {
    this.setState({ to: to });
  },
  updateKBTo: function(kbto) {
    this.setState({ kbto: kbto });
  },
  updateSubject: function(e) {
    this.setState({ subject: e.target.value });
  },
  updateEmail: function(e) {
    this.setState({ email: e.target.value });
  },
  componentDidMount: function() {
    InReplyToStore.addChangeListener(this._onInReplyToChange);
  },
  _onInReplyToChange: function() {
    let inReplyTo = InReplyToStore.get();
    let defaultTo = '';
    let defaultSubject = '';
    if (Object.keys(inReplyTo).length !== 0) {
      let to = messageParsing.getMessageHeader(inReplyTo, 'To');
      let from = messageParsing.getMessageHeader(inReplyTo, 'From');
      let me = document.getElementById('myEmail').innerHTML;
      defaultTo = (from !== me) ? from : to;

      let subject = messageParsing.getMessageHeader(inReplyTo, 'Subject');
      if (!subject.startsWith('Re:')) {
        subject = 'Re: ' + subject;
      }
      defaultSubject = subject;
    }
    this.setState({
      to: defaultTo,
      inReplyTo: inReplyTo,
      subject: defaultSubject,
    });
  },
  encryptEmail: function(keyManagers) {
    return new Promise(function(fulfill, reject) {
      var params = {
        msg: this.state.email,
        encrypt_for: keyManagers,
      };
      kbpgp.box(params, function(err, result_string, result_buffer) {
        if (!err) {
          fulfill(result_string);
        } else {
          reject(err);
        }
      });
    }.bind(this));
  },
  send: function(e) {
    var toManager = keybaseAPI.publicKeyForUser(this.state.kbto)
      .then(keybaseAPI.managerFromPublicKey);

    Promise.all([toManager, ourPublicKeyManager])
      .then(this.encryptEmail)
      .then(function(encryptedEmail) {
        var email = {
          to: this.state.to,
          subject: this.state.subject,
          email: encryptedEmail,
          parentMessage: this.state.inReplyTo
        }

        console.log('Sending encrypted mail to ' + this.state.to);
        request({
            method: 'POST',
            url: window.location.origin + '/sendMessage',
            json: true,
            body: email
          }, function(error, response, body) {
            if (error) {
              // Tell the user about the error.
              console.log('Error send (network error, server down, etc.).');
              this.setState({ feedback: 'Sending encountered an error.' });
            } else if (response.statusCode == 200) {
              console.log('Done with send successfully. Mail should have been sent.');
              this.setState(this.getInitialState());
              $('#composeMessage').modal('hide');
            } else {
              console.log('Done with send but server not happy. Mail should not have been sent.');
              this.setState({ feedback: 'Sending encountered a server error.' });
            }
          }.bind(this)
        );
      }.bind(this))
      .catch(function(err) {
        console.log(err);
        this.setState({ feedback: err.toString() });
      }.bind(this));
  },
  render: function() {
    return (
      <div className="modal fade" id="composeMessage">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title">Compose Email</h4>
            </div>
            <div className="modal-body">
              <form className="form-horizontal">
                <div className="form-group">
                  <label htmlFor="to">To:</label>
                  <ContactsAutocomplete updateParent={this.updateTo}/>
                </div>
                <div className="form-group">
                  <label htmlFor="kbto">Keybase ID of Recipient:</label>
                  <KeybaseAutocomplete updateParent={this.updateKBTo}/>
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Subject:</label>
                  <input type="text" value={this.state.subject} name="subject" id="subject" onChange={this.updateSubject} className="form-control"></input><br />
                </div>
                <div className="form-group">
                  <textarea value={this.state.email} name="email" id="email" onChange={this.updateEmail} className="form-control"></textarea><br />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button onClick={this.send} className="btn btn-primary">Send</button>
              <span className="error">{this.state.feedback}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = ComposeArea;
