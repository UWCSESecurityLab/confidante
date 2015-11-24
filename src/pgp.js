'use strict'
var kbpgp = require('kbpgp');

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
 * Generates a PGP key pair.
 * @param emailAddress The email address of the key's owner.
 * @return a Promise containing an object with the following data:
 *   publicKey: The PGP public key
 *   privateKey: The PGP private key
 */
exports.generateKeyPair = function(emailAddress) {
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
    }

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

    let exportKeys = function(keyManager) {
      // Create promises for exporting both the public and private key
      let exportPublic = new Promise(function(resolve, reject) {
        keyManager.export_pgp_public({}, function(err, pgp_public) {
          if (err) {
            reject(err);
          } else {
            resolve(pgp_public)
          }
        });
      });
      let exportPrivate = new Promise(function(resolve, reject) {
        keyManager.export_pgp_private({}, function(err, pgp_private) {
          if (err) {
            reject(err);
          } else {
            resolve(pgp_private);
          }
        });
      });
      return Promise.all([exportPublic, exportPrivate]);
    }

    generateEccKeys('<' + emailAddress + '>')
      .then(signKeys)
      .then(exportKeys)
      .then(function(keypair) {
        resolve({
          publicKey: keypair[0],
          privateKey: keypair[1]
        });
      })
      .catch(function(err) {
        reject(err);
      });
  });
}
