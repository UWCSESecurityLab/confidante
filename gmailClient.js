'use strict';
var Imap = require('imap');

function buildOAuthString(email, accessToken) {
  return new Buffer(
    'user=' + email + '\x01auth=Bearer ' + accessToken + '\x01\x01')
    .toString('base64');
}

class gmailClient {
  constructor(user) {
    var oauthString = buildOAuthString(user.profile.emails[0].value, user.accessToken);
    this.imap = new Imap({
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      xoauth2: oauthString
    });
  }

  fetchInbox() {
    imap.once('ready', function() {
      imap.openBox('INBOX', true, function(error, inbox) {
        if (error) return error;
        imap.seq.fetch()
      })
    });

    imap.connect();
  }


}

modules.exports = gmailClient;
