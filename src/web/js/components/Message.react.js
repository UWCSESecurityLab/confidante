'use strict';

const React = require('react');
const DateFormat = require('dateformat');
const ErrorBody = require('./ErrorBody.react');
const InboxActions = require('../actions/InboxActions');
const KeybaseCard = require('./KeybaseCard.react');
const messageParsing = require('../messageParsing');

function getTwitterFromUser(user) {
  let proofs = user.proofs_summary.by_proof_type;
  if (proofs.twitter) {
    return proofs.twitter[0].nametag;
  }
}
function getGithubFromUser(user) {
  let proofs = user.proofs_summary.by_proof_type;
  if (proofs.github) {
    return proofs.github[0].nametag;
  }
}

/**
 * A message is one email message inside a thread, displayed in the inbox.
 * It decrypts its contents.
 */
var Message = React.createClass({
  propTypes: {
    error: React.PropTypes.instanceOf(Error),
    message: React.PropTypes.object,
    plaintext: React.PropTypes.string,
    signer: React.PropTypes.object
  },

  getInitialState: function() {
    return {
      body: 'Decrypting...',
      showOriginal: false
    };
  },

  reply: function() {
    InboxActions.setInReplyTo({
      message: this.props.message,
      replyAll: false
    });
    InboxActions.setComposeUIOpen();
  },

  replyAll: function() {
    console.log(this.props.message)
    InboxActions.setInReplyTo({
      message: this.props.message,
      replyAll: true
    });
    InboxActions.setComposeUIOpen();
  },

  showOriginalChanged: function() {
    this.setState({ showOriginal: !this.state.showOriginal });
  },

  render: function() {
    let from = messageParsing.getMessageHeader(this.props.message, 'From');
    let to = messageParsing.getMessageHeader(this.props.message, 'To');

    let multipleRecipients = to.split(',').length > 1;

    let date = new Date(messageParsing.getMessageHeader(this.props.message, 'Date'));
    let now = new Date(Date.now());
    let timestamp;
    if (now.getYear() == date.getYear()) {
      timestamp = DateFormat(date, 'dddd, mmm d \'at\' h:MM tt');
    } else {
      timestamp = DateFormat(date, 'm/dd/yy \'at\' h:MM tt');
    }

    let body;
    if (!this.props.error && this.props.plaintext && !this.state.showOriginal) {
      body = (
        <div className="messageBody">
          {this.props.plaintext}
        </div>
      );
    } else if (!this.props.error && this.props.plaintext && this.state.showOriginal) {
      body = (
        <div className="alert alert-warning">
          {messageParsing.getMessageBody(this.props.message)}
        </div>
      );
    } else if (!this.props.error && this.props.plaintext === undefined) {
      body = (
        <div className="messageBody alert alert-info">
          Decrypting...
          <span className="spinner"></span>
        </div>
      );
    } else if (this.props.error) {
      body = <ErrorBody error={this.props.error} message={this.props.message} />;
    }

    let signer;
    if (this.props.signer && this.props.signer.user && this.props.signer.user.length === 1) {
      let user = this.props.signer.user[0];

      // Convert the user object into the format used for our Keybase component.
      let formattedUser = {
        'full_name': user.profile ? user.profile.full_name : null,
        'username': user.basics ? user.basics.username : null,
        'picture': user.pictures ? user.pictures.primary.url : null,
        'twitter': getTwitterFromUser(user),
        'github': getGithubFromUser(user)
      };
      signer = ( <KeybaseCard data={formattedUser}/> );
    }

    return (
      <div className="message">
        <div className="messageHeader">
          <div className="sender">
            <strong>{from}</strong>
            <div>To: {to}</div>
            <a className="show-original" onClick={this.showOriginalChanged}>
              {this.state.showOriginal ? 'Show Decrypted' : 'Show Encrypted'}
            </a>
          </div>
          <div className="message-timestamp">
            <p>{timestamp}</p>
          </div>

        </div>

        {body}

        { signer
          ? <div>
              <p className="signature-header">Message was signed by:</p> {signer}
            </div>
          : <div>
              <p className="signature-header">This message was not cryptographically signed.</p> {signer}
            </div>
        }

        <button type="button" className="btn btn-primary reply" onClick={this.reply}>
          <span className="reply-arrow glyphicon glyphicon-share-alt" aria-hidden="true"></span>
          Reply
        </button>
        { multipleRecipients ?
          <button type="button" className="btn btn-primary reply" onClick={this.replyAll}>
            <span className="glyphicon glyphicon-share-alt" aria-hidden="true"></span>
            <span className="reply-all-arrow glyphicon glyphicon-share-alt" aria-hidden="true"></span>
            Reply All
          </button>
          : null }
      </div>
    );
  }
});

module.exports = Message;
