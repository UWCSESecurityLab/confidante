'use strict';

var React = require('react');
var ComposeStore = require('../stores/ComposeStore');
var MessageStore = require('../stores/MessageStore');
var InboxActions = require('../actions/InboxActions');
var messageParsing = require('../messageParsing');
var keybaseAPI = require('../keybaseAPI');
var kbpgp = require('kbpgp');
var xhr = require('xhr');
/* eslint-disable no-unused-vars */
var ContactsAutocomplete = require('./ContactsAutocomplete.react');
var KeybaseAutocomplete = require('./KeybaseAutocomplete.react');
/* eslint-enable no-unused-vars */

var ourPrivateManager;
MessageStore.getPrivateManager().then(function(privateManager) {
  ourPrivateManager = privateManager;
});

var ourPublicKeyManager =
  Promise
    .reject(new Error('Key manager for local public key not yet created.'))
    .catch(function() {});

(function() {
  try {
    var me = JSON.parse(localStorage.getItem('keybase'));
    var pubkey = me.public_keys.primary.bundle;
    ourPublicKeyManager = keybaseAPI.managerFromPublicKey(pubkey);
  } catch (err) {
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
      sendingSpinner: false,
      inReplyTo: ComposeStore.getReply(),
      invite: ComposeStore.getInvite()
    };
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
    ComposeStore.addChangeListener(this._onComposeStoreChange);
    ComposeStore.addResetListener(this._onReset);
  },
  _onComposeStoreChange: function() {
    let invite = ComposeStore.getInvite();
    let inReplyTo = ComposeStore.getReply();
    let replyAll = ComposeStore.getReplyAll();
    let defaultTo = this.state.to;
    let defaultSubject = this.state.subject;
    let me = document.getElementById('myEmail').innerHTML;
    console.log('replyall', replyAll);

    if (Object.keys(inReplyTo).length !== 0) {
      if (replyAll) {
        let messageParticipants = messageParsing.getParticipantsInMessage(inReplyTo);
        messageParticipants = messageParticipants.filter((person) => {
          return !messageParsing.isSameAddress(me, person);
        });
        defaultTo = messageParticipants.join(', ');
      } else {
        let to = messageParsing.getMessageHeader(inReplyTo, 'To');
        let from = messageParsing.getMessageHeader(inReplyTo, 'From');
        defaultTo = (from !== me) ? from : to;
      }

      // Subject handled identically regardless of replyAll status.
      let subject = messageParsing.getMessageHeader(inReplyTo, 'Subject');
      if (!subject.startsWith('Re:')) {
        subject = 'Re: ' + subject;
      }
      defaultSubject = subject;
    }
    this.setState({
      to: defaultTo,
      inReplyTo: inReplyTo,
      invite: invite,
      subject: defaultSubject
    });
  },
  _onReset: function() {
    this.replaceState(this.getInitialState());
    $('#composeMessage').modal('hide');
  },
  encryptEmail: function(keyManagers) {
    return new Promise(function(fulfill, reject) {
      var params = {
        msg: this.state.email,
        encrypt_for: keyManagers,
        sign_with: ourPrivateManager
      };
      kbpgp.box(params, function(err, result_string) {
        if (!err) {
          fulfill(result_string);
        } else {
          reject(err);
        }
      });
    }.bind(this));
  },
  send: function() {
    this.setState({ sendingSpinner: true });

    let users = this.state.kbto
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    let keyManagers = users.map((user) => {
      return keybaseAPI.publicKeyForUser(user).then(keybaseAPI.managerFromPublicKey);
    });
    keyManagers.push(ourPublicKeyManager);

    Promise.all(keyManagers)
      .then(this.encryptEmail)
      .then(function(encryptedEmail) {
        var email = {
          to: this.state.to,
          subject: this.state.subject,
          email: encryptedEmail,
          parentMessage: this.state.inReplyTo
        };

        xhr.post({
          url: window.location.origin + '/sendMessage',
          json: email,
          withCredentials: true
        }, function(error, response) {
          if (error) {
            this.setState({ feedback: 'Couldn\'t connect to the Keymail server.' });
          } else if (response.statusCode == 200) {
            InboxActions.resetComposeFields();
          } else if (response.statusCode == 401) {
            this.setState({ feedback: 'Your login expired! Sign in again and try sending the email again.' });
          } else {
            this.setState({ feedback: 'Something in Keymail broke. Sorry!' });
          }
          this.setState({ sendingSpinner: false });
        }.bind(this));
      }.bind(this))
      .catch(function(err) {
        this.setState({ feedback: err.toString(), sendingSpinner: false });
      }.bind(this));
  },

  sendInvite: function() {
    this.setState({ sendingSpinner: true });
    let getKey = function(recipient) {
      return new Promise(function(resolve, reject) {
        xhr.get({
          url: window.location.origin + '/invite/getKey?recipient=' + recipient
        }, function(error, response, body) {
          if (error) {
            console.error(error);
            reject('Couldn\'t connect to Keymail. Try refreshing the page.');
          } else if (response.statusCode == 401) {
            reject('Your login expired! Sign in and try again.');
          } else {
            resolve(JSON.parse(body));
          }
        });
      });
    };

    let encryptMessage = function(message, publicKey) {
      return new Promise(function(resolve, reject) {
        kbpgp.KeyManager.import_from_armored_pgp({
          armored: publicKey
        }, function(err, invitee) {
          if (err) {
            console.error(err);
            reject(err);
            return;
          }
          kbpgp.box({
            msg: message,
            encrypt_for: invitee
          }, function(err, armored) {
            if (err) {
              console.error(err);
              reject(err);
            } else {
              resolve(armored);
            }
          });
        });
      });
    };

    let sendInvite = function(id, subject, message) {
      return new Promise(function(resolve, reject) {
        xhr.post({
          url: window.location.origin + '/invite/sendInvite',
          json: {
            inviteId: id,
            message: message,
            subject: subject
          }
        }, function(error, response) {
          if (error) {
            console.error(error);
            reject('Couldn\'t connect to Keymail. Try refreshing the page.');
          } else if (response.statusCode == 401) {
            reject('Your login expired! Sign in and try again.');
          } else {
            resolve();
          }
        });
      });
    };

    let inviteId = '';
    getKey(this.state.to).then(response => {
      inviteId = response.inviteId;
      return encryptMessage(this.state.email, response.publicKey);
    }).then(encryptedMessage =>
      sendInvite(inviteId, this.state.subject, encryptedMessage)
    ).then(function() {
      InboxActions.resetComposeFields();
    }.bind(this)).catch(err => {
      this.setState({ feedback: err.toString(), sendingSpinner: false });
    });
  },

  render: function() {
    return (
      <div className="modal fade" id="composeMessage">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title">
                { this.state.invite
                  ? <span>Invite a friend to Keymail</span>
                  : <span>Compose Email</span>
                }
              </h4>
            </div>
            <div className="modal-body">
              <form className="form-horizontal" autoComplete="off">
                <div className="form-group">
                  <label htmlFor="to">To:</label>
                  <ContactsAutocomplete to={this.state.to} updateParent={this.updateTo}/>
                </div>
                { this.state.invite
                  ? null
                  : <div className="form-group">
                      <label htmlFor="kbto">Keybase ID of Recipient:</label>
                      <KeybaseAutocomplete updateParent={this.updateKBTo}/>
                    </div>
                }
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
              <div className="alert alert-danger">{this.state.feedback}</div>
              { this.state.sendingSpinner
                ? <span className="spinner"></span>
                : null
              }
              { this.state.invite
                ? <button onClick={this.sendInvite} className="btn btn-primary">Encrypt and Invite</button>
                : <button onClick={this.send} className="btn btn-primary">Encrypt and Send</button>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = ComposeArea;
