'use strict';

var request = require('request');
var buffer = require('buffer');
var crypto = require('crypto');
var purepack = require('purepack');
var kbpgp = require('kbpgp');
// var scrypt = scrypt_module_factory(67108864);

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
      size: 224,
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
             fulfill(loginBody);
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
      request(
        { method: 'GET',
          url: this.serverBaseURI + '/getSalt.json',
          qs: {
            email_or_username: this.username
          }
        }, function(error, response, body) {
          if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            fulfill(body);
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

      request(
        { method: 'POST',
          url: this.serverBaseURI + '/login.json',
          qs: {
            'email_or_username': this.username,
            'hmac_pwh': hmac_pwh,
            'login_session': saltDetails.login_session
          }
        },
        function (error, response, body) {
          if (error) {
            reject(body);
          } else if (response.statusCode == 200) {
            fulfill(JSON.parse(body));
          } else {
            reject(body);
          }
        }
      );
    }.bind(this));
  }

  static publicKeyForUser(user) {
    return new Promise(function(fulfill, reject) {
      request(
        { method: 'GET',
          url: 'https://keybase.io/' + user + '/key.asc',
        },
        function(error, response, body) {
          if (error) {
            reject('Internal error attempting to fetch key for user ' + user);
          } else if (response.statusCode == 200) {
            fulfill(body);
          } else {
            reject('Error code ' + response.statusCode + ' from keybase for key.asc for user ' + user);
          }
        }
      );
    });
  }

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

// static autocomplete(q) {
//   return new Promise(function(fulfill, reject) {
//     request(
//       { method: 'POST',
//         url: 'https://keybase.io/_/api/1.0/user/autocomplete.json'
//         qs: {
//           q: q
//         }
//       },
//       function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//           fulfill(body);
//         } else {
//           reject(error);
//         }
//       }
//     );
// });

getKeyBundleFromLoginBody(loginBody) {
  var buf = new Buffer(loginBody.me.private_keys.primary.bundle, 'base64');
  var p3skbObj = purepack.unpack(buf);
  return p3skbObj;
}
}
module.exports = KeybaseAPI;
