'use strict';

/**
 * This module holds the values of all of the command line flags. Any module
 * can include this file.
 */
let toolnameArg = process.argv.find((arg) => arg.startsWith('--toolname='));

if (toolnameArg) {
  let toolname = toolnameArg.split('=')[1];
  if (toolname == 'Keymail' || toolname == 'Mailsafe') {
    exports.TOOLNAME = toolname;
  } else {
    console.error(toolname + 'Is not a valid hostname');
    throw new Error(toolnameArg + 'is not a valid hostname');
  }
}

exports.PRODUCTION = process.argv.indexOf('--prod') != -1;
exports.KEYBASE_STAGING = process.argv.indexOf('--keybase-staging') != -1;
