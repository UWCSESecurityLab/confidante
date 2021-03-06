'use strict';

const ComposeStore = require('../stores/ComposeStore');
const ContactsAutocomplete = require('./ContactsAutocomplete.react');
const kbpgp = require('kbpgp');
const KeybaseAutocomplete = require('./KeybaseAutocomplete.react');
const InboxActions = require('../actions/InboxActions');
const InputError = require('../../../error').InputError;
const KeybaseAPI = require('../keybaseAPI');
const messageParsing = require('../messageParsing');
const MessageStore = require('../stores/MessageStore');
const React = require('react');
const xhr = require('xhr');

let gmail = MessageStore.getGmailClient();
let userKeyManager = MessageStore.getPrivateManager();

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
  updateChecked: function() {
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
      signerKBID = getKBIDFromSigner(MessageStore.getInboxState().signers[inReplyTo.id]);
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
  },

  /**
   * Encrypts the message written in the ComposeArea.
   * @param {array} keyManagers An array of kbpgp KeyManagers, representing the
   * public keys of the recipients. Must also include the current user's
   * KeyManager (so they can also read the message).
   * @return {Promise} string containing the PGP encrypted message.
   */
  encryptEmail: function(keyManagers) {
    return new Promise(function(fulfill, reject) {
      // This happens if the sender didn't fill in any Keybase Usernames
      if (keyManagers.length <= 1) {
        reject(new InputError('Please provide the Keybase Username of the user you wish to encrypt to.'));
        return;
      }
      userKeyManager.then(function(privateKeyManager) {
        let params = {
          msg: this.state.email,
          encrypt_for: keyManagers
        };
        if (this.state.checked) {
          params.sign_with = privateKeyManager;
        }
        kbpgp.box(params, function(err, result_string) {
          if (!err) {
            fulfill(result_string);
          } else {
            reject(err);
          }
        });
      }.bind(this));
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
      return KeybaseAPI.publicKeyForUser(user)
          .then(KeybaseAPI.managerFromPublicKey);
    });
    keyManagers.push(userKeyManager);

    Promise.all(keyManagers)
      .then(this.encryptEmail)
      .then(function(encryptedEmail) {
        if (this.state.to.length === 0) {
          throw new InputError('Please specify at least one recipient email address.');
        }
        return gmail.sendMessage({
          to: this.state.to,
          subject: this.state.subject,
          body: encryptedEmail,
          parentMessage: this.state.inReplyTo
        });
      }.bind(this)).then(function() {
        InboxActions.resetComposeFields();
        InboxActions.clearAutocompletions();
        InboxActions.refresh();
        InboxActions.setComposeUIClose();
        this.props.onSent();
      }.bind(this)).catch(function(error) {
        switch (error.name) {
          case 'GoogleAuthError':
            this.setState({ feedback: 'Your Gmail login expired! Sign in again and try sending the email again.' });
            break;
          case 'InputError':
            this.setState({ feedback: error.message });
            break;
          case 'NetworkError':
            this.setState({ feedback: 'Couldn\'t connect to ' + error.message });
            break;
          case 'NoPrivateKeyError':
            this.setState({ feedback: 'Confidante couldn\'t send your message because your PGP private key isn\'t stored with Keybase.' });
            break;
          case 'NoPublicKeyError':
            this.setState({ feedback: error.message + ' didn\'t put their public key on Keybase, so Confidante couldn\'t encrypt your message.' });
            break;
          default:
            this.setState({ feedback: 'Something in ' + this.props.toolname + ' broke: ' + error.toString()});
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

  onClose: function() {
    InboxActions.setComposeUIClose();
    InboxActions.resetComposeFields();
  },

  render: function() {
    var style = { display: ComposeStore.getDisplayCompose() ? 'block' : 'none' };

    return (
      <div className="compose-area" style={style}>
        <div className="compose-header">
          <button type="button" className="close" aria-label="Close" onClick={this.onClose}>
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 className="modal-title">
            { this.state.invite
              ? <span>Invite a friend to {this.props.toolname}</span>
              : <span>New Message</span>
            }
          </h4>
        </div>
        <div>
          <form autoComplete="off">
            <ContactsAutocomplete to={this.state.to} updateParent={this.updateTo}/>
            { this.state.invite
              ? null
              : <KeybaseAutocomplete kbto={this.state.kbto} updateParent={this.updateKBTo}/>
            }
            <input type="text"
                    value={this.state.subject}
                    name="subject" id="subject"
                    placeholder="Subject"
                    onChange={this.updateSubject}
                    className="compose-input">
            </input>
            <textarea value={this.state.email}
                      name="email"
                      placeholder="Content in this area will be encrypted"
                      id="compose-body"
                      onChange={this.updateEmail}
                      rows="18"
                      className="compose-input">
            </textarea>
          </form>
        </div>
        <div className="compose-footer">
          <div className="alert alert-danger">{this.state.feedback}</div>
          <div className="compose-send">
            <button onClick={this.presend} className="btn btn-primary">
              { this.state.invite
                ? 'Encrypt and Invite'
                : 'Encrypt and Send'
              }
            </button>
            <input type="checkbox"
                   name="sign-private-key"
                   checked={this.state.checked}
                   onChange={this.updateChecked}/>
            <span id="sign-label">Sign email</span>
            { this.state.sendingSpinner
              ? <span className="spinner"></span>
              : null
            }
            <br/>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = ComposeArea;
