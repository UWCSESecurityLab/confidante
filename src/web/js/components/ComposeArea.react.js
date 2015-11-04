'use strict';

var React = require('react');
var InReplyToStore = require('../stores/InReplyToStore'); 

/**
 * The ComposeArea is the UI for writing a new email, whether a reply
 * or a new thread.
 */
var ComposeArea = React.createClass({
  getInitialState: function() {
    return {
      to: '',
      KBto: '',
      subject: '',
      email: '',
      feedback: '',
      inReplyTo: InReplyToStore.get()
    }
  },
  updateTo: function(e) {
    this.setState({ to: e.target.value });
  },
  updateKBTo: function(e) {
    this.setState({ KBto: e.target.value });
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
    console.log('_onInReplyToChange');
    let inReplyTo = InReplyToStore.get();
    console.log('inReplyTo is: ' + inReplyTo);
    this.setState( { inReplyTo: inReplyTo } );
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
    var toManager = keybaseAPI.publicKeyForUser(this.state.KBto)
      .then(keybaseAPI.managerFromPublicKey);

    Promise.all([toManager, ourPublicKeyManager])
      .then(this.encryptEmail)
      .then(function(encryptedEmail) {
        var email = {
          to: this.state.to,
          subject: this.state.subject,
          email: encryptedEmail
        }

        console.log('Sending encrypted mail to ' + this.state.to);
        request({
            method: 'POST',
            url: 'http://localhost:3000/sendMessage',
            json: true,
            body: email
          }, function(error, response, body) {
            if (error) {
              // Tell the user about the error.
              console.log('Error send (network error, server down, etc.).');
              this.setState({ feedback: 'Sending encountered an error.' });
            } else if (response.statusCode == 200) {
              console.log('Done with send successfully. Mail should have been sent.');
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
    let reply = this.state.inReplyTo ? 'Reply' : 'Not Reply';
    return (
      <div className="modal fade" id="composeMessage">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title">Compose {reply} Email</h4>
            </div>
            <div className="modal-body">
              <form className="form-horizontal">
                <div className="form-group">
                  <label htmlFor="to">To:</label>
                  <input type="text" name="to" id="to" onChange={this.updateTo} className="form-control"></input><br />
                </div>
                <div className="form-group">
                  <label htmlFor="kbto">Keybase ID of Recipient:</label>
                  <input type="text" name="kbto" id="kbto" onChange={this.updateKBTo} className="form-control"></input><br />
                </div>
                <div className="form-group">
                <label htmlFor="subject">Subject:</label>
                <input type="text" name="subject" id="subject" onChange={this.updateSubject} className="form-control"></input><br />
                </div>
                <div className="form-group">
                  <textarea name="email" id="email" onChange={this.updateEmail} className="form-control"></textarea><br />
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
