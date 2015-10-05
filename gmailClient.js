'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var credentials = require('./client_secret.json');

class gmailClient {
  constructor(user) {
    var auth = new googleAuth();
    this.oauth2Client = new auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );
    this.oauth2Client.credentials = {
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    };
  }
  /**
   * Returns a string listing the labels
   */
  listLabels(callback) {
    console.log('calling listLabels');
    var gmail = google.gmail('v1');
    gmail.users.labels.list({
      auth: this.oauth2Client,
      userId: 'me',
    }, function(err, response) {
      if (err) {
        console.log(err);
        callback(['The API returned an error: ' + err]);
      }
      var labels = response.labels;
      if (labels.length == 0) {
        console.log('No labels found.');
        callback(['No labels found.']);
      } else {
        callback(labels.map(function(label) { return label.name }));
      }
    });
  }
}

module.exports = gmailClient;
