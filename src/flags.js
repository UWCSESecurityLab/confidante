'use strict';

/**
 * This module holds the values of all of the command line flags. Any module
 * can include this file.
 */
let validToolnames = ['Keymail', 'Mailsafe', 'Confidante'];

let toolnameArg = process.argv.find((arg) => arg.startsWith('--toolname='));
if (toolnameArg) {
  let toolname = toolnameArg.split('=')[1];
  if (validToolnames.indexOf(toolname) !== -1) {
    exports.TOOLNAME = toolname;
  } else {
    console.error(toolname + 'Is not a valid tool name');
    throw new Error(toolnameArg + 'is not a valid tool name');
  }
} else {
  // Default to Confidante
  exports.TOOLNAME = 'Confidante';
}

exports.PRODUCTION = process.env.NODE_ENV === 'production';
exports.KEYBASE_STAGING = process.argv.indexOf('--keybase-staging') != -1;
exports.ELECTRON = process.versions['electron'] !== undefined;
