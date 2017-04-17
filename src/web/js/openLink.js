'use strict';
const flags = require('../../flags');
let shell;
if (flags.ELECTRON) {
  shell = window.require('electron').shell;
}

/**
 * Helper function for opening links that should be displayed in the browser
 * even when using Electron. Pass this as an onClick attribute to <a> elements
 * that link to external sites in Electron-accessible pages.
 */
function openLink(e) {
  if (flags.ELECTRON) {
    e.preventDefault();
    shell.openExternal(e.target.href);
  }
}

module.exports = openLink;
