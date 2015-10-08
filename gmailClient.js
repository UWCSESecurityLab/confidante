'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var credentials = require('./client_secret.json');

class GmailClient {
  /**
   * Constructs a new Gmail Client.
   * @param googleAuth.OAuth2.OAuth2Client: An authenticaed Google OAuth2 client.
   */
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
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

module.exports = GmailClient;
