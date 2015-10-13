// Strings used to build PGP Armor
var ARMOR_LINE = '-----';
var BEGIN = 'BEGIN PGP';
var END = 'END PGP';
var ARMOR_TYPES = [
  'MESSAGE',
  'PUBLIC KEY BLOCK',
  'PRIVATE KEY BLOCK',
  'SIGNATURE'
];

function header(type) {
  return ARMOR_LINE + BEGIN + ' ' + type + ARMOR_LINE;
}

function footer(type) {
  return ARMOR_LINE + END + ' ' + type + ARMOR_LINE;
}

exports.containsPGPArmor = function(text) {
  for (var i = 0; i < ARMOR_TYPES.length; i++) {
    var type = ARMOR_TYPES[i];
    if (text.includes(header(type)) && text.includes(footer(type))) {
      return true;
    }
  }
  return false;
}
