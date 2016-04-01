'use strict';

var React = require('react');
var DateFormat = require('dateformat');
var ErrorBody = require('./ErrorBody.react');
var InboxActions = require('../actions/InboxActions');
var KeybaseCard = require('./KeybaseCard.react');
var messageParsing = require('../messageParsing');

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
  getInitialState: function() {
    return {
      body: 'Decrypting...'
    };
  },

  reply: function() {
    InboxActions.setInReplyTo({
      message: this.props.message,
      replyAll: false
    });
  },

  replyAll: function() {
    InboxActions.setInReplyTo({
      message: this.props.message,
      replyAll: true
    });
  },

  render: function() {
    let from = messageParsing.getMessageHeader(this.props.message, 'From');
    let to = messageParsing.getMessageHeader(this.props.message, 'To');

    let date = new Date(messageParsing.getMessageHeader(this.props.message, 'Date'));
    let now = new Date(Date.now());
    let timestamp;
    if (now.getYear() == date.getYear()) {
      timestamp = DateFormat(date, "dddd, mmm d 'at' h:MM tt");
    } else {
      timestamp = DateFormat(date, "m/dd/yy 'at' h:MM tt");
    }

    let body;
    if (!this.props.error && this.props.plaintext) {
      body = (
        <div className="messageBody">
          {this.props.plaintext}
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
      body = <ErrorBody error={this.props.error} message={this.props.message} />
    }

    let signer;
    if (this.props.signer && this.props.signer.user && this.props.signer.user.length === 1) {
      let user = this.props.signer.user[0];
      // Convert the user object into the format used for our Keybase component.
      let formattedUser = {
        'full_name': user.profile.full_name,
        'username': user.basics.username,
        'picture': user.pictures.primary.url,
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
            <p>To: {to}</p>
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
          : null }

        <button type="button" className="btn btn-primary reply" data-toggle="modal" data-target="#composeMessage" onClick={this.reply}>
          <span className="reply-arrow glyphicon glyphicon-share-alt" aria-hidden="true"></span>
          Reply
        </button>
        <button type="button" className="btn btn-primary reply" data-toggle="modal" data-target="#composeMessage" onClick={this.replyAll}>
          <span className="glyphicon glyphicon-share-alt" aria-hidden="true"></span>
          <span className="reply-all-arrow glyphicon glyphicon-share-alt" aria-hidden="true"></span> 
          Reply All
        </button>
      </div>
    );
  }
});

module.exports = Message;
