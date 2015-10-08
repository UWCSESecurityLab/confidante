'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var credentials = require('./client_secret.json');

class GmailClient {
  /**
   * Constructs a new authenticated Gmail Client.
   * @param token The token object provided by the Google OAuth library
   */
  constructor(token) {
    var auth = new googleAuth();
    this.oauth2Client = new auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );
    console.log('Constructing new Gmail client with token data:');
    console.log(token);
    this.oauth2Client.credentials = token;
    this.gmail = google.gmail('v1');
  }

  /**
   * Get the authenticated user's email address.
   * @return a Promise containing the email address as a string.
   */
  getEmailAddress() {
    var gmail = this.gmail;
    var oauth2Client = this.oauth2Client;
    return new Promise(function(resolve, reject) {
      gmail.users.getProfile({
        auth: oauth2Client,
        userId: 'me'
      }, function(err, response) {
        if (err) { reject(err); }
        resolve(response.emailAddress);
      });
    });
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
