'use strict';
const Invite = require('./models/invite.js');

function getInvite(inviteId) {
  return new Promise(function(resolve, reject) {
    Invite.findOne({'_id': inviteId}, function(err, invite) {
      if (err) {
        reject(err);
      } else {
        resolve(invite);
      }
    });
  });
}

/**
 * Creates a new invite with its key pairs. At this point, the message has not
 * yet been sent to the server, so the invite only contains the id, recipient,
 * and key pair.
 * @param recipient The email address of the recipient.
 * @param keys.publicKey The armored public PGP key
 * @param keys.privateKey The armored private PGP key
 */
function storeInviteKeys(recipient, keys) {
  return new Promise(function(resolve, reject) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 2);
    let invite = new Invite({
      recipient: recipient,
      expires: expires,
      pgp: {
        public_key: keys.publicKey,
        private_key: keys.privateKey
      }
    });
    invite.save(function(err, savedInvite) {
      if (err) {
        reject(err);
      } else {
        resolve(savedInvite);
      }
    });
  });
}

module.exports = {
  getInvite: getInvite,
  storeInviteKeys: storeInviteKeys,
};
