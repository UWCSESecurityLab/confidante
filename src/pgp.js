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
 * @param userId The id of the key's owner.
 * @return a Promise containing an object with the following data:
 *   publicKey: The PGP public key
 *   privateKey: The PGP private key
 */
exports.generateKeyPair = function(userId) {
  return new Promise(function(resolve, reject) {
    console.log('Generating keys...');
    kbpgp.KeyManager.generate_ecc({ userid: userId }, function(err, keyManager) {
      if (err) {
        reject(err);
        return;
      }
      console.log('Signing keys...')
      keyManager.sign({}, function(signErr) {
        if (signErr) {
          reject(signErr);
          return;
        }
        // Create promises for exporting both the public and private key
        let publicPromise = new Promise(function(resolve, reject) {
          keyManager.export_pgp_public({}, function(err, pgp_public) {
            if (err) {
              reject(err);
            } else {
              resolve(pgp_public)
            }
          });
        });
        let privatePromise = new Promise(function(resolve, reject) {
          keyManager.export_pgp_private({}, function(err, pgp_private) {
            if (err) {
              reject(err);
            } else {
              resolve(pgp_private);
            }
          });
        });
        console.log('Exporting keys...');
        Promise.all([publicPromise, privatePromise]).then(function(values) {
          console.log('Keys successfully exported.');
          resolve({
            publicKey: values[0],
            privateKey: values[1]
          });
        }).catch(function(err) {
          reject(err);
        });
      });
    });
  });
}
