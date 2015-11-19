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
        user.save(function(err) {
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

module.exports = {
  getUser: getUser,
  storeKeybaseCredentials: storeKeybaseCredentials,
  storeGoogleCredentials: storeGoogleCredentials
}
