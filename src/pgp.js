'use strict';
const kbpgp = require('kbpgp');

// Strings used to build PGP Armor
var ARMOR_LINE = '-----';
var BEGIN = 'BEGIN PGP';
var END = 'END PGP';

var ARMOR_TYPES = {
  MESSAGE: 'MESSAGE',
  PUBLIC_KEY_BLOCK: 'PUBLIC KEY BLOCK',
  PRIVATE_KEY_BLOCK: 'PRIVATE KEY BLOCK',
  SIGNATURE: 'SIGNATURE'
};
exports.ARMOR_TYPES = ARMOR_TYPES;

function header(type) {
  return ARMOR_LINE + BEGIN + ' ' + type + ARMOR_LINE;
}

function footer(type) {
  return ARMOR_LINE + END + ' ' + type + ARMOR_LINE;
}

/**
 * Returns the type of PGP data in a string.
 * @param text The string to check for PGP armor.
 * @return the type of PGP block in text, if it exists. Otherwise returns
 *         undefined.
 */
exports.parsePGPType = function(text) {
  for (var type in ARMOR_TYPES) {
    if (text.includes(header(ARMOR_TYPES[type])) &&
        text.includes(footer(ARMOR_TYPES[type]))) {
      return ARMOR_TYPES[type];
    }
  }
  return '';
};

/**
 * Returns whether the string 'text' contains a PGP message.
 * @param text The string to check for a PGP message.
 * @return true if it contains a PGP message, false otherwise.
 */
exports.containsPGPMessage = function(text) {
  return text.includes(header(ARMOR_TYPES.MESSAGE)) && text.includes(footer(ARMOR_TYPES.MESSAGE));
};

/**
 * Generates an Armored PGP key pair.
 * @param emailAddress The email address of the key's owner.
 * @param passphrase (optional)
 * @return a Promise containing an object with the following data:
 *   publicKey: The PGP public key
 *   privateKey: The PGP private key
 */
exports.generateArmoredKeyPair = function(emailAddress, passphrase) {
  return new Promise(function(resolve, reject) {
    generateKeyPair(emailAddress)
      .then(function(keyManager) {
        return Promise.all([
          exportArmoredPublicKey(keyManager),
          exportArmoredPrivateKey(keyManager, passphrase)
        ]);
      }).then(function(keys) {
        resolve({ publicKey: keys[0], privateKey: keys[1] });
      }).catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Generates a PGP key pair, and exports them in a format to upload to Keybase.
 * @param emailAddress The email address of the key's owner.
 * @param passphrase The Keybase passphrase to encrypt the private key with.
 * @return a Promise containing an object with the following data:
 *   publicKey: Armored public key
 *   p3skbPrivateKey: Base64-encoded MsgPacked P3SKB private key
 */
exports.generateKeysForUpload = function(emailAddress, passphrase) {
  return new Promise(function(resolve, reject) {
    generateKeyPair(emailAddress)
      .then(function(keyManager) {
        return Promise.all([
          exportArmoredPublicKey(keyManager),
          exportP3skbPrivateKey(keyManager, passphrase)
        ]);
      }).then(function(keyData) {
        resolve({
          publicKey: keyData[0],
          p3skbPrivateKey: keyData[1]
        });
      }).catch(function(err) {
        reject(err);
      });
  });
};

function generateKeyPair(emailAddress) {
  return new Promise(function(resolve, reject) {
    let generateEccKeys = function(id) {
      return new Promise(function(resolve, reject) {
        kbpgp.KeyManager.generate_ecc({ userid: id }, function(err, keyManager) {
          if (err) {
            reject(err);
          } else {
            resolve(keyManager);
          }
        });
      });
    };

    let signKeys = function(keyManager) {
      return new Promise(function(resolve, reject) {
        keyManager.sign({}, function(signErr) {
          if (signErr) {
            reject(signErr);
          } else {
            resolve(keyManager);
          }
        });
      });
    };

    generateEccKeys('<' + emailAddress + '>')
      .then(signKeys)
      .then(function(keyManager) {
        resolve(keyManager);
      }).catch(function(err) {
        reject(err);
      });
  });
}

function exportArmoredPublicKey(keyManager) {
  return new Promise(function(resolve, reject) {
    keyManager.export_pgp_public({}, function(err, pgp_public) {
      if (err) {
        reject(err);
      } else {
        resolve(pgp_public);
      }
    });
  });
}

function exportArmoredPrivateKey(keyManager, passphrase) {
  return new Promise(function(resolve, reject) {
    let opts = {};
    if (passphrase) {
      opts.passphrase = passphrase;
    }
    keyManager.export_pgp_private(opts, function(err, pgp_private) {
      if (err) {
        reject(err);
      } else {
        resolve(pgp_private);
      }
    });
  });
}

function exportP3skbPrivateKey(keyManager, passphrase) {
  return new Promise(function(resolve, reject) {
    keyManager.export_private({
      passphrase: passphrase,
      p3skb: true
    }, function(err, p3skb) {
      if (err) {
        reject(err);
      } else {
        resolve(p3skb);
      }
    });
  });
}
