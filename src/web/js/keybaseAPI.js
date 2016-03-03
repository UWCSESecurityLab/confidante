'use strict';

var crypto = require('crypto');
var kbpgp = require('kbpgp');
var p3skb = require('../../p3skb');
var purepack = require('purepack');
var scrypt = scrypt_module_factory(67108864);
var xhr = require('xhr');

/**
 * Client for accessing the Keybase API from the browser.
 * CORS enabled calls are implemented as static methods.
 * Non-CORS enabled calls require the class to be instantiated.
 */
class KeybaseAPI extends kbpgp.KeyFetcher {
  /**
   * Creates a new KeybaseAPI instance. We need to do this to set the URL of occurred
   * local server, which could be localhost or some other domain.
   */
  constructor(serverBaseURI) {
    super();
    this.serverBaseURI = serverBaseURI;
  }

  /**
   * Perform the password hash step of the Keybase login flow by scrypting
   * the passphrase from the user and the salt from the server with the appropriate
   * parameters and returning buf.slice(192) from that result.
   * @return a Buffer containing the password hash used in the /login.json step.
   */
  static computePasswordHash(passphrase, salt) {
    var SCRYPT_PARAMS = {
      N: Math.pow(2,15),
      cost: Math.pow(2,15),
      r: 8,
      blockSize: 8,
      p: 1,
      parallel: 1,
      size: 224
    };

    passphrase = new Buffer(passphrase);
    salt = new Buffer(salt, 'hex');

    try {
      // var res = scrypt.hashSync(passphrase, SCRYPT_PARAMS, 224, salt);
      var res = scrypt.crypto_scrypt(passphrase,
                                     salt,
                                     SCRYPT_PARAMS.N,
                                     SCRYPT_PARAMS.r,
                                     SCRYPT_PARAMS.p,
                                     SCRYPT_PARAMS.size);
      var buf = new Buffer(res);
      return buf.slice(192);
    } catch (e) {
      console.log('Password hash computation failed!');
      return undefined;
    }
  }

  static userLookup(keyFingerprint) {
    return new Promise(function(resolve, reject) {
      xhr.get({
        url: 'https://keybase.io/_/api/1.0/user/lookup.json?key_fingerprint=' + keyFingerprint
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    });
  }

  /**
   * Perform the 2-step Keybase login flow using the username and password
   * with which the API was initialized. This API resolves whether the login
   * succeeded or not.
   * @return a Promise containing the body of the response to a login attempt.
   */
  login(emailOrUsername, passphrase) {
    return new Promise(function(resolve, reject) {
      this._getSalt(emailOrUsername)
        .then(function(saltDetails) {
          return this._login(emailOrUsername, passphrase, saltDetails);
        }.bind(this)).then(function(loginBody) {
          if (loginBody.status.code != 0) {
            reject(loginBody);
          } else {
            resolve(loginBody);
          }
        }).catch(function(err) {
         reject(err);
        });
    }.bind(this));
  }

  /**
   * Get the salt for the username with which the API was configured.
   * @return a Promise containing the response to the getSalt/ api.
   */
  _getSalt(emailOrUsername) {
    console.log('Get salt...');
    return new Promise(function(resolve, reject) {
      xhr.get({
        url: this.serverBaseURI + '/keybase/getsalt.json?email_or_username=' + emailOrUsername
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Perform the /login.json step of the Keybase login flow.
   * @return a Promise containing the body of the response to a login attempt.
   */
  _login(emailOrUsername, passphrase, saltDetails) {
    console.log('Login...');
    return new Promise(function(resolve, reject) {
      let salt = saltDetails.salt;
      let login_session = new Buffer(saltDetails.login_session, 'base64');
      let hash = KeybaseAPI.computePasswordHash(passphrase, salt);
      let hmac_pwh = crypto.createHmac('SHA512', hash).update(login_session).digest('hex');

      xhr.post({
        url: this.serverBaseURI + '/keybase/login.json?' +
             'email_or_username=' + emailOrUsername + '&' +
             'hmac_pwh=' + hmac_pwh + '&' +
             'login_session=' + encodeURIComponent(saltDetails.login_session)
      }, function (error, response, body) {
        if (error) {
          reject(body);
        } else if (response.statusCode == 200) {
          resolve(JSON.parse(body));
        } else {
          reject(body);
        }
      });
    }.bind(this));
  }

  signup(name, email, username, passphrase, invitation_id) {
    return new Promise(function(resolve, reject) {
      let salt = crypto.randomBytes(16);
      let pwh = KeybaseAPI.computePasswordHash(passphrase, salt);

      xhr.post({
        url: this.serverBaseURI + '/keybase/signup.json?' +
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
  addKey(publicKey, privateKey) {
    return new Promise(function(resolve, reject) {
      xhr.post({
        url: this.serverBaseURI + '/keybase/key/add.json?' +
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
  fetchKey(pgpKeyIds, ops) {
    return new Promise(function(resolve, reject) {
      xhr.get({
        url: this.serverBaseURI + '/keybase/key/fetch.json?' +
             'pgp_key_ids=' + pgpKeyIds.join(',') + '&' +
             'ops=' + ops
      }, function(error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    }.bind(this));
  }

  /**
   * Implements the KeyFetcher interface.
   * Fetch keys using the method for accessing the /keybase/key/fetch.json
   * endpoint.
   */
  fetch(ids, ops, cb) {
    let hexIds = ids.map((buf) => buf.toString('hex'));
    console.log('KeybaseAPI.fetch(' + hexIds + ', ' + ops + ')');
    this.fetchKey(hexIds, ops).then(function(response) {
      for (let i = 0; i < hexIds.length; i++) {
        let inputId = hexIds[i];
        for (let j = 0; j < response.keys.length; j++) {
          let key = response.keys[j];
          let possibleIds = new Set();
          possibleIds.add(key.kid);
          for (var subkey in key.subkeys) {
            possibleIds.add(subkey);
          }
          if (possibleIds.has(inputId)) {
            let importKey;
            if (key.bundle.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
              importKey = kbpgp.KeyManager.import_from_armored_pgp;
            } else {
              importKey = kbpgp.KeyManager.import_from_p3skb;
            }
            importKey({ armored: key.bundle }, function(err, keyManager) {
              if (err) {
                console.log('Failed to make KeyManager with bundle');
                console.log(key.bundle);
                cb([err]);
              } else {
                console.log(key.username);
                console.log(keyManager);
                cb([null, keyManager, i]);
              }
            });
            return;
          }
        }
      }
      cb(['No matching keys found']);
    }).catch(function(err) {
      console.log('Couldn\'t fetch from Keybase');
      console.log(err);
      cb([err]);
    });
  }

  /**
   * publicKeyForUser retrieves the given user's public key from Keybase.
   *
   * @return key.asc for the given user (an ASCII armored public key).
   */
  static publicKeyForUser(user) {
    return new Promise(function(resolve, reject) {
      xhr.get({
        url: 'https://keybase.io/' + user + '/key.asc'
      }, function(error, response, body) {
        if (error) {
          reject('Internal error attempting to fetch key for user ' + user);
        } else if (response.statusCode == 200) {
          resolve(body);
        } else {
          reject('Error code ' + response.statusCode + ' from keybase for key.asc for user ' + user);
        }
      });
    });
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
            console.log(err);
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
  decrypt(ciphertext) {
    return function(privateManager) {
      return new Promise(function(resolve, reject) {
        kbpgp.unbox(
          {
            keyfetch: this,
            armored: ciphertext
          },
          function(err, literals) {
            if (err !== null) {
              console.log('Decryption fail');
              console.log(err);
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
      xhr.get({
        url: 'https://keybase.io/_/api/1.0/user/autocomplete.json?q=' + q
      }, function (error, response, body) {
        handleKeybaseResponse(error, response, body, resolve, reject);
      });
    });
  }

  getKeyBundleFromLoginBody(loginBody) {
    var buf = new Buffer(loginBody.me.private_keys.primary.bundle, 'base64');
    var p3skbObj = purepack.unpack(buf);
    return p3skbObj;
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
