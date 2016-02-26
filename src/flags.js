'use strict';

/**
 * This module holds the values of all of the command line flags. Any module
 * can include this file.
 */
exports.PRODUCTION = process.argv.indexOf('--prod') != -1;
exports.KEYBASE_STAGING = process.argv.indexOf('--keybase-staging') != -1;
