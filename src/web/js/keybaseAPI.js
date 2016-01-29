'use strict';

var crypto = require('crypto');
var kbpgp = require('kbpgp');
var p3skb = require('../../p3skb');
var purepack = require('purepack');
var scrypt = scrypt_module_factory(67108864);
var xhr = require('xhr');

class KeybaseAPI {
  constructor(username, passphrase, serverBaseURI) {
    this.passphrase = passphrase;
    this.username = username;
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

  /**
   * Perform the 2-step Keybase login flow using the username and password
   * with which the API was initialized. This API fulfills whether the login
   * succeeded or not.
   * @return a Promise containing the body of the response to a login attempt.
   */
  login() {
    return new Promise(function(fulfill, reject) {
      this._getSalt(this.username)
           .then(this._login.bind(this))
           .then(function(loginBody) {
             if (loginBody.status.code != 0) {
               reject(loginBody);
             } else {
               fulfill(loginBody);
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
  _getSalt() {
    console.log('Get salt...');
    return new Promise(function(fulfill, reject) {
      xhr.get({
        url: this.serverBaseURI + '/keybase/getsalt.json?email_or_username=' + this.username
      }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          fulfill(JSON.parse(body));
        } else {
          reject(error);
        }
      });
    }.bind(this));
  }

  /**
   * Perform the /login.json step of the Keybase login flow.
   * @return a Promise containing the body of the response to a login attempt.
   */
  _login(saltDetails) {
    console.log('Login...');
    console.log('saltDetails: ' + JSON.stringify(saltDetails, null, 4));
    return new Promise(function(fulfill, reject) {
      var salt = saltDetails.salt;
      var login_session = new Buffer(saltDetails.login_session, 'base64');
      var hash = KeybaseAPI.computePasswordHash(this.passphrase, salt);
      var hmac_pwh = crypto.createHmac('SHA512', hash).update(login_session).digest('hex');

      xhr.post({
        url: this.serverBaseURI + '/keybase/login.json?' +
             'email_or_username=' + this.username + '&' +
             'hmac_pwh=' + hmac_pwh + '&' +
             'login_session=' + urlSafeBase64(saltDetails.login_session)
      }, function (error, response, body) {
        if (error) {
          reject(body);
        } else if (response.statusCode == 200) {
          fulfill(JSON.parse(body));
        } else {
          reject(body);
        }
      });
    }.bind(this));
  }

  signup(name, email, invitation_id) {
    return new Promise(function(resolve, reject) {
      let salt = crypto.randomBytes(16);
      let pwh = KeybaseAPI.computePasswordHash(this.passphrase, salt);

      xhr.post({
        url: this.serverBaseURI + '/keybase/signup.json?' +
             'name=' + name + '&' +
             'email=' + email + '&' +
             'username=' + this.username + '&' +
             'pwh=' + pwh.toString('hex') + '&' +
             'salt=' + salt.toString('hex') + '&' +
             'invitation_id=' + invitation_id + '&' +
             'pwh_version=3'
      }, function(error, response, body) {
        if (error) {
          reject(error);
        } else if (JSON.parse(body).status.code == 0) {
          resolve(body);
        } else {
          console.log('Failed to sign up');
          reject(body);
        }
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
             'private_key=' + urlSafeBase64(privateKey) + '&' +
             'is_primary=true'
      }, function(error, response, body) {
        console.log(response);
        if (error) {
          reject(error);
        } else if (response.statusCode == 200 && JSON.parse(body).status.code == 0) {
          resolve(JSON.parse(body));
        } else {
          console.log('Failed to add key');
          reject(body);
        }
      });
    }.bind(this));
  }

  /**
   * publicKeyForUser retrieves the given user's public key from Keybase.
   *
   * @return key.asc for the given user (an ASCII armored public key).
   */
  static publicKeyForUser(user) {
    return new Promise(function(fulfill, reject) {
      xhr.get({
        url: 'https://keybase.io/' + user + '/key.asc'
      }, function(error, response, body) {
        if (error) {
          reject('Internal error attempting to fetch key for user ' + user);
        } else if (response.statusCode == 200) {
          fulfill(body);
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
    return new Promise(function(fulfill, reject) {
      kbpgp.KeyManager.import_from_armored_pgp({
        armored: pubkey
      }, function(err, keyManager) {
        if (err) {
          reject(err);
        } else {
          fulfill(keyManager);
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
    return new Promise(function(fulfill, reject) {
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
            fulfill(manager);
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
  static decrypt(ciphertext) {
    return function(privateManager) {
      return new Promise(function(fulfill, reject) {
        var ring = new kbpgp.keyring.KeyRing();
        ring.add_key_manager(privateManager);
        kbpgp.unbox(
          {
            keyfetch: ring,
            armored: ciphertext
          },
          function(err, literals) {
            if (err !== null) {
              reject(err);
            } else {
              fulfill(literals[0].toString());
            }
          });
      });
    };
  }

  static autocomplete(q) {
    return new Promise(function(fulfill, reject) {
      xhr.get({
        url: 'https://keybase.io/_/api/1.0/user/autocomplete.json?q=' + q
      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          fulfill(body);
        } else {
          reject(error);
        }
      });
    });
  }

  getKeyBundleFromLoginBody(loginBody) {
    var buf = new Buffer(loginBody.me.private_keys.primary.bundle, 'base64');
    var p3skbObj = purepack.unpack(buf);
    return p3skbObj;
  }
}

// Escape special characters for URLs in base64 encoded data.
// Annoyingly, Keybase doesn't use the conventional URL safe base64 encoding,
// instead we must replace the invalid characters with the URL escape
// characters.
function urlSafeBase64(b64String) {
    return b64String
        .replace(/\+/g, '%2B')
        .replace(/\//g, '%2F')
        .replace(/\=/g, '%3D');
}

module.exports = KeybaseAPI;
