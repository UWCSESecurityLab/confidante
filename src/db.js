'use strict'
var Invite = require('./models/invite.js');
var User = require('./models/user.js');

function getUser(keybaseId) {
  return new Promise(function(resolve, reject) {
    User.findOne({'keybase.id': keybaseId}, function(err, user) {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  });
}

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
 * Creates and stores new User from their Keybase credentials. If the user has
 * already used our service, then nothing needs to be updated.
 * @param keybase The login object returned from the Keybase API
 * @return an empty promise
 */
 function storeKeybaseCredentials(keybase) {
  return new Promise(function(resolve, reject) {
    getUser(keybase.me.id).then(function(user) {
      if (user) {
        resolve();
      } else {
        // Currently we only store the id. We can store other non-sensitive
        // info here in the future, like the profile picture.
        let newUser = new User({ keybase: { id: keybase.me.id }});
        newUser.save(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    }).catch(function(err) {
      reject(err);
    });
  });
}

/**
 * Creates or updates a User's Google credentials.
 * @param keybaseId The identifier for the user
 * @param email The user's email address
 * @param refreshToken The Google OAuth refresh Token
 * @return Empty Promise
 */
function storeGoogleCredentials(keybaseId, email, refreshToken) {
  return new Promise(function(resolve, reject) {
    getUser(keybaseId).then(function(user) {
      if (user) {
        user.google.refreshToken = refreshToken;
        user.google.email = email;
        user.save(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        reject('Could not find user');
      }
    }).catch(function(err) {
      reject(err);
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
      recipientEmail: recipient,
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
  getUser: getUser,
  storeInviteKeys: storeInviteKeys,
  storeGoogleCredentials: storeGoogleCredentials,
  storeKeybaseCredentials: storeKeybaseCredentials
}
