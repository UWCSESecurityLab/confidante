'use strict';
var BrowserBox = require('browserbox');

function buildOAuthString(email, accessToken) {
  return new Buffer(
    'user=' + email + '\x01auth=Bearer ' + accessToken + '\x01\x01')
    .toString('base64');
}

class gmailClient {
  constructor(user) {
    var oauthString = buildOAuthString(user.profile.emails[0].value, user.accessToken);
    this.client = new BrowserBox({
      host: 'imap.gmail.com',
      port: 993,
      options: {
        auth: {
          xoauth2: oauthString
        },
        requireTLS: true
      }
    });
  }
}

module.exports = gmailClient;
