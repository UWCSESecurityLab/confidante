'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var credentials = require('./client_secret.json');

class GmailClient {
  /**
   * Constructs a new authenticated Gmail Client.
   * @param token The token object provided by the Google OAuth library.
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
  }

  /**
   * Get the authenticated user's email address.
   * @return a Promise containing the email address as a string.
   */
  getEmailAddress() {
    var oauth2Client = this.oauth2Client;
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.getProfile({
        auth: oauth2Client,
        userId: 'me'
      }, function(err, response) {
        if (err) { reject(err); }
        resolve(response.emailAddress);
      });
    });
  }

  /**
   * Get the user's labels.
   * @return a Promise containing an array of strings.
   */
  listLabels() {
    var oauth2Client = this.oauth2Client;
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.labels.list({
        auth: oauth2Client,
        userId: 'me',
      }, function(err, response) {
        if (err) reject(err);
        var labels = response.labels;
        resolve(labels.map(function(label) { return label.name }));
      });
    })
  }
}

module.exports = GmailClient;
