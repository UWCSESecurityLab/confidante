'use strict';

var React = require('react');
var ComposeStore = require('../stores/ComposeStore');
var ContactsAutocomplete = require('./ContactsAutocomplete.react');
const GmailClient = require('../../../gmailClient');
const GoogleOAuth = require('../../../googleOAuth');
var kbpgp = require('kbpgp');
var KeybaseAutocomplete = require('./KeybaseAutocomplete.react');
var InboxActions = require('../actions/InboxActions');
var KeybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var MessageStore = require('../stores/MessageStore');
var xhr = require('xhr');

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
    ourPublicKeyManager = KeybaseAPI.managerFromPublicKey(pubkey);
  } catch (err) {
    ourPublicKeyManager = Promise.reject(new Error(err));
  }
})();

// TODO: Better token handling, client side authorization checks.
let token = GoogleOAuth.getAccessToken();
if (!token) {
  console.error('No token stored');
}
let gmail = new GmailClient(token.access_token);


function getKBIDFromSigner(signer) {
  if (signer && signer.user && signer.user[0] && signer.user[0].basics) {
    return signer.user[0].basics.username;
  }
}

/**
 * The ComposeArea is the UI for writing a new email, whether a reply
 * or a new thread.
 */
var ComposeArea = React.createClass({
  propTypes: {
    onSent: React.PropTypes.func,
    toolname: React.PropTypes.string
  },

  getInitialState: function() {
    return {
      to: '',
      kbto: [],
      subject: '',
      email: '',
      feedback: '',
      sendingSpinner: false,
      checked: 'checked',
      inReplyTo: ComposeStore.getReply(),
      invite: ComposeStore.getInvite()
    };
  },

  // Update the to field, optionally pass a callback to be called when the state
  // is changed.
  updateTo: function(to, onUpdate) {
    this.setState({ to: to }, onUpdate);
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
  updateChecked: function(e) {
    this.setState({ checked: !this.state.checked });
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

    let kbto = [];
    let signerKBID;
    if (inReplyTo && Object.keys(inReplyTo).length > 0) {
      signerKBID = getKBIDFromSigner(MessageStore.getAll().signers[inReplyTo.id]);
      // console.log(`signer's KBID is ${signerKBID}`);
    }

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
        if (signerKBID) {
          kbto = [signerKBID];
        }

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
      subject: defaultSubject,
      kbto: kbto
    });
  },
  _onReset: function() {
    this.replaceState(this.getInitialState());
    $('#composeMessage').modal('hide');
  },
  encryptEmail: function(keyManagers) {
    return new Promise(function(fulfill, reject) {
      // This happens if the sender didn't fill in any Keybase Usernames
      if (keyManagers.length <= 1) {
        reject('Please give the Keybase Username of the user you wish to encrypt to.');
        return;
      }
      var params;
      if(this.state.checked) {
        params = {
          msg: this.state.email,
          encrypt_for: keyManagers,
          sign_with: ourPrivateManager
        };
      } else {
        params = {
          msg: this.state.email,
          encrypt_for: keyManagers
        };
      }
      kbpgp.box(params, function(err, result_string) {
        if (!err) {
          fulfill(result_string);
        } else {
          reject(err);
        }
      });
    }.bind(this));
  },

  /**
   * Hacky code called when the send button is pressed. It triggers an action to
   * force ContactsAutocomplete to resolve partial emails before sending.
   * It passes either the sendInvite or send function to ContactsAutocomplete
   * through the action, so that it can be called after the emails have between
   * resolved. It also passes setBadEmailAddress in case the partial email
   * is invalid.
   */
  presend: function() {
    InboxActions.forceTokenize(this.state.invite ? this.sendInvite : this.send,
                               this.setBadEmailAddress);
  },

  send: function() {
    this.setState({ sendingSpinner: true });

    let keyManagers = this.state.kbto.map((user) => {
      return KeybaseAPI.publicKeyForUser(user).then(KeybaseAPI.managerFromPublicKey);
    });
    keyManagers.push(ourPublicKeyManager);

    // let linkids = MessageStore.getAll().linkids;
    // let parentLinkID = null;
    // if (this.state.inReplyTo) {
    //   parentLinkID = linkids[this.state.inReplyTo.id];
    // }
    Promise.all(keyManagers)
      .then(this.encryptEmail)
      .then(function(encryptedEmail) {
        if (this.state.to.length === 0) {
          throw new Error('Please specify at least one recipient email address.');
        }
        return gmail.sendMessage({
          to: this.state.to,
          subject: this.state.subject,
          body: encryptedEmail,
          parentMessage: this.state.inReplyTo
          // linkid: parentLinkID
        });
      }.bind(this)).then(function() {
        InboxActions.resetComposeFields();
        InboxActions.clearAutocompletions();
        InboxActions.refresh();
        this.props.onSent();
      }).catch(function(error) {
        console.error(error);
        // TODO: figure out the error cases and rewrite the handling here
        if (error) {
          this.setState({ feedback: 'Couldn\'t connect to the ' + this.props.toolname + ' server.' });
        } else if (error.statusCode == 401) { // TODO: Figure out how to figure if unauthenticated
          this.setState({ feedback: 'Your login expired! Sign in again and try sending the email again.' });
        } else {
          this.setState({ feedback: 'Something in ' + this.props.toolname + ' broke. Sorry!' });
        }
        this.setState({ sendingSpinner: false });
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
            reject('Couldn\'t connect to ' + this.props.toolname + '. Try refreshing the page.');
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
            reject('Couldn\'t connect to ' + this.props.toolname + '. Try refreshing the page.');
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

  setBadEmailAddress: function(invalidEmail) {
    let msg = invalidEmail + ' is not a valid email address. Please correct it and try again.';
    this.setState({ feedback: msg });
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
                  ? <span>Invite a friend to {this.props.toolname}</span>
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
                      <label htmlFor="kbto">Keybase Username of Recipient:</label>
                      <KeybaseAutocomplete kbto={this.state.kbto} updateParent={this.updateKBTo}/>
                    </div>
                }
                <div className="form-group">
                  <label htmlFor="subject">Subject:</label>
                  <input type="text"
                         value={this.state.subject}
                         name="subject" id="subject"
                         onChange={this.updateSubject}
                         className="form-control">
                  </input>
                  <br/>
                </div>
                <div className="form-group">
                  <textarea value={this.state.email}
                            name="email"
                            id="email"
                            onChange={this.updateEmail}
                            rows="8"
                            className="form-control">
                  </textarea>
                  <label><input type="checkbox" name="sign-private-key" checked={this.state.checked} onChange={this.updateChecked}/> Sign email with my Private Key</label><br/>
                  <br/>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <div className="alert alert-danger">{this.state.feedback}</div>
              { this.state.sendingSpinner
                ? <span className="spinner"></span>
                : null
              }
              <button onClick={this.presend} className="btn btn-primary">
                { this.state.invite
                  ? 'Encrypt and Invite'
                  : 'Encrypt and Send'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = ComposeArea;
