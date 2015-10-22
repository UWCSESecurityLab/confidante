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
}

/**
 * Returns whether the string 'text' contains a PGP message.
 * @param text The string to check for a PGP message.
 * @return true if it contains a PGP message, false otherwise.
 */
exports.containsPGPMessage = function(text) {
  return text.includes(header(ARMOR_TYPES.MESSAGE)) && text.includes(footer(ARMOR_TYPES.MESSAGE));
}
