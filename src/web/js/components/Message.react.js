'use strict';

var React = require('react');
var messageParsing = require('../messageParsing');

/*eslint-disable no-unused-vars*/
var KeybaseCard = require('./KeybaseCard.react');
var InboxActions = require('../actions/InboxActions');
var ErrorBody = require('./ErrorBody.react');
/*eslint-enable no-unused-vars*/

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
    var from = messageParsing.getMessageHeader(this.props.message, 'From');
    var to = messageParsing.getMessageHeader(this.props.message, 'To');

    var body;
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
          <strong>{from}</strong>
          <p>To: {to}</p>
        </div>
        {body}
        <button type="button" className="btn btn-primary reply" data-toggle="modal" data-target="#composeMessage" onClick={this.reply}>
          Reply
        </button>
        <button type="button" className="btn btn-primary reply" data-toggle="modal" data-target="#composeMessage" onClick={this.replyAll}>
          Reply All
        </button>

        { signer
          ? <div>
              <p className="signature-header">Message was signed by:</p>
              {signer}
            </div>
          : null }
      </div>
    );
  }
});

module.exports = Message;
