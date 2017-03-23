'use strict';

const Auth = require('keybase-proofs').Auth;
const crypto = require('crypto');
const flags = require('../../flags');
const isemail = require('isemail');
const kbpgp = require('kbpgp');
const p3skb = require('../../p3skb');
const purepack = require('purepack');
const querystring = require('querystring');
const triplesec = require('triplesec');
const request = require('request');
const Sets = require('../../set.js');

const ORIGIN = window.location.origin + '/keybase';
const KB_STAGING = 'https://stage0.keybase.io';
const KB_PROD = 'https://keybase.io';
const API_STRING = '/_/api/1.0';

// The host to use when directly making requests to Keybase (staging vs. prod).
const kbUrl = document.getElementById('staging') ? KB_STAGING : KB_PROD;
// The host to use when using non-CORS enabled Keybase APIs (native vs. web).
const nonCors = flags.ELECTRON ? kbUrl + API_STRING : ORIGIN;

/**
 * Client for accessing the Keybase API from the browser.
 * CORS enabled calls are implemented as static methods.
 * Non-CORS enabled calls require the class to be instantiated.
 */
class KeybaseAPI {
  /**
   * Get the Keybase base URL, which depends on if Keymail is in staging mode.
   * @return {string} The Keybase base URL (protocol and host)
   */
  static url() {
    return kbUrl + API_STRING;
  }

  /**
   * @return {boolean} true if running in Keybase staging mode.
   */
  static isStaging() {
    return kbUrl === KB_STAGING;
  }

  static userLookup(keyFingerprint) {
    return new Promise(function(resolve, reject) {
      request.get({
        url: kbUrl + API_STRING + '/user/lookup.json?key_fingerprint=' + keyFingerprint
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Perform the 2-step Keybase login flow using the username and password
   * with which the API was initialized.
   * @return a Promise containing the body of the response to a login attempt.
   */
  static login(emailOrUsername, passphrase) {
    return new Promise(function(resolve, reject) {
      let salt, session, email, username;
      if (isemail.validate(emailOrUsername)) {
        email = emailOrUsername;
      } else {
        username = emailOrUsername;
      }

      KeybaseAPI._getSalt(emailOrUsername)
        .then(function(saltDetails) {
          salt = saltDetails.salt;
          session = saltDetails.login_session;
          return KeybaseAPI._computePasswordHash(passphrase, salt);
        }).then(function(keys) {
          return Promise.all([
            KeybaseAPI._makeSignature(keys.v4, email, username, session),
            KeybaseAPI._makeSignature(keys.v5, email, username, session)
          ]);
        }).then(function(sigs) {
          return KeybaseAPI._login(emailOrUsername, sigs[0], sigs[1]);
        }).then(function(loginBody) {
          resolve(loginBody);
        }).catch(function(err) {
          reject(err);
        });
    }.bind(this));
  }

  /**
   * Retrieve a salt and a session token from Keybase.
   * @param {string} emailOrUsername The user's email or username.
   * @return {Promise} The JSON response object, containing the salt and session.
   */
  static _getSalt(emailOrUsername) {
    return new Promise(function(resolve, reject) {
      let qs = querystring.stringify({
        email_or_username: emailOrUsername,
        pdpka_login: true
      });
      request.get({
        url: nonCors + '/getsalt.json?' + qs
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Compute the password hash, using scrypt, and return bytes 192-256 of the
   * hash, which are used in Keybase's login protocol as EdDSA private keys.
   * @param {string} passphrase The Keybase passphrase
   * @param {string} salt The salt from the getSalt JSON endpoint.
   * @return {Promise} An object containing the v4 and v5 keys specified by
   * Keybase. Each key is represented by a Uint8Array.
   */
  static _computePasswordHash(passphrase, salt) {
    return new Promise((resolve, reject) => {
      let pwBuf = new Buffer(passphrase, 'utf8');
      let saltBuf = new Buffer(salt, 'hex');

      // scrypt is included in the TripleSec library.
      let encryptor = new triplesec.Encryptor({ key: pwBuf });
      encryptor.resalt({
        salt: saltBuf,
        extra_keymaterial: 64
      }, function(err, hash) {
        if (err) {
          reject(err);
        } else {
          resolve({
            v4: hash.extra.slice(0, 32),
            v5: hash.extra.slice(32, 64)
          });
        }
      });
    });
  }

  /**
   * Generate a Keybase-style signature to authenticate the user with Keybase.
   * @param {Uint8Array} key The v4 or v5 key extracted from the hashed password
   * @param {string} email (undefined if the user provided a username instead)
   * @param {string} username (undefined if the user provided an email instead)
   * @param {string} session The session token sent with the salt.
   * @return {Promise} A Keybase-style signature object
   */
  static _makeSignature(key, email, username, session) {
    return new Promise((resolve, reject) => {
      kbpgp.rand.SRF().random_bytes(16, (nonce) => {
        kbpgp.kb.KeyManager.generate({seed: key}, (err, signer) => {
          if (err) {
            reject(err);
            return;
          }
          let auth = new Auth({
            sig_eng : signer.make_sig_eng(),
            host: 'keybase.io',
            user: {
              local: {
                email: email,
                username: username
              }
            },
            session : session,
            nonce : nonce
          });
          auth.generate(function(err, signature) {
            if (err) {
              reject(err);
            } else {
              resolve(signature.armored);
            }
          });
        });
      });
    });
  }

  /**
   * POST the login request to Keybase.
   * @param {string} emailOrUsername
   * @param {string} pdpka4 The Keybase signature created with the v4 key
   * @param {string} pdpka5 The Keybase signature created with the v5 key
   * @return a Promise containing the body of the response to a login attempt.
   */
  static _login(emailOrUsername, pdpka4, pdpka5) {
    return new Promise(function(resolve, reject) {
      let qs = querystring.stringify({
        email_or_username: emailOrUsername,
        pdpka5: pdpka5,
        pdpka4: pdpka4,
        pdpka_login: true
      });
      request.post({
        url: nonCors + '/login.json?' + qs
      }, function (error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  static signup(name, email, username, passphrase, invitation_id) {
    return new Promise(function(resolve, reject) {
      let salt = crypto.randomBytes(16);
      let pwh = KeybaseAPI.computePasswordHash(passphrase, salt);

      request.post({
        url: nonCors + '/signup.json?' +
             'name=' + name + '&' +
             'email=' + email + '&' +
             'username=' + username + '&' +
             'pwh=' + pwh.toString('hex') + '&' +
             'salt=' + salt.toString('hex') + '&' +
             'invitation_id=' + invitation_id + '&' +
             'pwh_version=3'
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Adds a key to the user's Keybase account.
   * @param publicKey Armored public key
   * @param privateKey Base64 encoded MsgPacked P3SKB private key
   */
  static addKey(publicKey, privateKey) {
    return new Promise(function(resolve, reject) {
      request.post({
        url: nonCors + '/key/add.json?' +
             'public_key=' + encodeURIComponent(publicKey) + '&' +
             'private_key=' + encodeURIComponent(privateKey) + '&' +
             'is_primary=true'
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Fetch PGP key(s) by Key ID.
   * @param pgpKeyIds the ids of the keys to fetch
   * @param ops the operations the key will be used for, see Keybase docs
   * @return a Promise containing object of status, array of keys
   */
  static fetchKey(pgpKeyIds, ops) {
    return new Promise(function(resolve, reject) {
      request.get({
        url: nonCors + '/key/fetch.json?' +
             'pgp_key_ids=' + pgpKeyIds.join(',') + '&' +
             'ops=' + ops
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * publicKeyForUser retrieves the given user's public key from Keybase.
   * @param username
   * @return key.asc for the given user (an ASCII armored public key).
   */
  static publicKeyForUser(username) {
    return new Promise(function(resolve, reject) {
      request.get({
        url: kbUrl + '/' + username + '/key.asc'
      }, function(error, response, body) {
        if (error) {
          reject('Internal error attempting to fetch key for user ' + username);
        } else if (response.statusCode == 200) {
          resolve(body);
        } else {
          reject('Error code ' + response.statusCode +
                 ' from keybase for key.asc for user ' + username);
        }
      });
    }.bind(this));
  }

  /**
   * managerFromPublicKey takes a public key and returns a kbpgp.KeyManager
   * for that public key.
   *
   * @return A promise containing a kbpgp.KeyManager for the given public key.
   */
  static managerFromPublicKey(pubkey) {
    return new Promise(function(resolve, reject) {
      kbpgp.KeyManager.import_from_armored_pgp({
        armored: pubkey
      }, function(err, keyManager) {
        if (err) {
          reject(err);
        } else {
          resolve(keyManager);
        }
      });
    });
  }

  /**
   * getPrivateManager retreives the Keybase user bundle and passphrase from
   * localstorage and returns a promise containing a kbpgp.KeyManager for the
   * private key.
   *
   * @return A promise containing a kbpgp.KeyManager for the user's private
   * key.
   */
  static getPrivateManager() {
    return new Promise(function(resolve, reject) {
      var me = JSON.parse(localStorage.getItem('keybase'));
      if (!me) {
        reject('Nothing stored in local storage for me.');
        return;
      }
      var bundle = me.private_keys.primary.bundle;
      var passphrase = localStorage.getItem('keybasePassphrase');
      p3skb.p3skbToArmoredPrivateKey(bundle, passphrase)
      .then(function(armoredKey) {
        kbpgp.KeyManager.import_from_armored_pgp({
          armored: armoredKey
        }, function(err, manager) {
          if (!err) {
            resolve(manager);
          } else{
            reject(err);
          }
        });
      });
    });
  }


  /**
   * Takes a ciphertext and curries a decryption function that
   * decrypts that ciphertext given a private manager.
   * This is kind of backwards, in that it would make more sense
   * to load the private key once and then decrypt many messages
   * with it. This will happen down the line once we cache the
   * private key manager.
   *
   * @return A function which returns a promise which contains the
   * decryption of the ciphertext under the given private key.
   */
  static decrypt(ciphertext) {
    return function(privateManager) {
      return new Promise(function(resolve, reject) {
        let kf = new KeyFetcher(privateManager);
        kbpgp.unbox(
          {
            keyfetch: kf,
            armored: ciphertext
          },
          function(err, literals) {
            if (err !== null) {
              reject(err);
            } else {
              resolve(literals);
            }
          });
      }.bind(this));
    }.bind(this);
  }

  static autocomplete(q) {
    return new Promise(function(resolve, reject) {
      request.get({
        url: kbUrl + API_STRING + '/user/autocomplete.json?q=' + q
      }, function (error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  static getKeyBundleFromLoginBody(loginBody) {
    var buf = new Buffer(loginBody.me.private_keys.primary.bundle, 'base64');
    var p3skbObj = purepack.unpack(buf);
    return p3skbObj;
  }
}

class KeyFetcher extends kbpgp.KeyFetcher {
  constructor(privateManager) {
    super();
    this.privateManager = privateManager;
  }
  /**
   * Implements the KeyFetcher interface.
   * Fetch keys using the method for accessing the /keybase/key/fetch.json
   * endpoint.
   * @param {Vec<Buffer>} ids Ids to look for, any will do.
   * @param {number} ops The operations we need, represented as a compressed
   *   bitmask of operations from kbpgp.const.ops
   * @param {callback} cb The cb to call back when done; if successful,
   *   with a (KeyManager, int) pair.  The KeyManager is the found key
   *   to use, and the int is the index in the ids array it corresponds to.
   */
  fetch(ids, ops, cb) {
    let hexIds = ids.map((buf) => buf.toString('hex'));

    // First, check if the user's private key matches.
    let privateIds = new Set(this.privateManager.get_all_pgp_key_ids()
      .map(buf => buf.toString('hex')));
    let privateIdx = this.findMatchingIdIndex(hexIds, privateIds);
    if (privateIdx != -1) {
      cb(null, this.privateManager, privateIdx);
      return;
    }

    // Otherwise, search the key/fetch endpoint for matching keys.
    KeybaseAPI.fetchKey(hexIds, ops).then(function(response) {
      for (var i = 0; i < response.keys.length; i++) {
        let keyIds = this.makeKeyIdSet(response.keys[i]);
        let idx = this.findMatchingIdIndex(hexIds, keyIds);
        if (idx != -1) {
          let key = response.keys[i];
          kbpgp.KeyManager.import_from_armored_pgp({
            armored: key.bundle
          }, function(err, keyManager) {
            if (err) {
              cb(err);
            } else {
              cb(null, keyManager, idx);
            }
          });
          return;
        }
      }
      cb('No matching keys found');
    }.bind(this)).catch(function(err) {
      cb(err);
    });
  }

  /**
   * Converts the Keybase key object into a set containing the key ids of the
   * key and subkeys.
   * @param keyObj.kid A string representing the key id.
   * @param keyObj.subkeys An object of subkeys, where the keys to the object
   *        are the subkey ids.
   */
  makeKeyIdSet(keyObj) {
    let keyIds = new Set();
    keyIds.add(keyObj.kid);
    for (var subkey in keyObj.subkeys) {
      keyIds.add(subkey);
    }
    return keyIds;
  }

  /**
   * Given a list of requested ids, and the ids of a key, check if the key
   * matches.
   * @param Iterable of requested key ids.
   * @param Iterable of key ids and subkey ids belonging to a single key.
   * @param Index of the input id matching the key. -1 if none exist.
   */
  findMatchingIdIndex(inputIds, keyIds) {
    let input = new Set(inputIds);
    let keys = new Set(keyIds);
    let intersect = Sets.intersection(input, keys);
    if (intersect.size > 0) {
      return inputIds.indexOf(intersect.values().next().value);
    } else {
      return -1;
    }
  }
}

/**
 * Common logic for handling responses from the Keybase API using promises.
 */
function handleKeybaseResponse(error, response, body, resolve, reject) {
  if (error) {
    reject(error);
    return;
  }
  if (response.statusCode != 200) {
    reject(body);
    return;
  }
  try {
    let json = JSON.parse(body);
    if (json.status.code == 0) {
      resolve(json);
    } else {
      reject(json);
    }
  } catch(e) {
    reject(body);
  }
}

module.exports = KeybaseAPI;
