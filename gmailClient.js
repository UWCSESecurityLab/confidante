'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var pgp = require('./pgp.js');
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
    this.oauth2Client.credentials = token;
  }

  /**
   * Get the authenticated user's email address.
   * @return a Promise containing the email address as a string.
   */
  getEmailAddress() {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.getProfile({
        auth: this.oauth2Client,
        userId: 'me'
      }, function(err, response) {
        if (err) { reject(err); }
        resolve(response.emailAddress);
      });
    }.bind(this));
  }

  /**
   * Returns an array of PGP encrypted threads from the user's inbox.
   */
  getEncryptedInbox() {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.list({
        auth: this.oauth2Client,
        labelIds: 'INBOX',
        q: 'BEGIN PGP',
        userId: 'me'
      }, function(err, response) {
        if (err) reject(err);
        var threadRequestPromises = [];
        response.threads.forEach(function(threadSnippet) {
          threadRequestPromises.push(this.getThread(threadSnippet.id));
        }, this);
        Promise.all(threadRequestPromises).then(function(threads) {
          resolve(this.filterPGPThreads(threads));
        }.bind(this)).catch(function(error){
          reject(error);
        });
      }.bind(this));
    }.bind(this));
  }

  getThread(id) {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.get({
        auth: this.oauth2Client,
        id: id,
        userId: 'me'
      }, function(err, response) {
        if (err) reject(err);
        resolve(response);
      });
    }.bind(this));
  }

  /**
   * Removes all non-PGP encrypted messages from an array of messages.
   * @param threads Array of Gmail threads
   * @return Array of Gmail threads that are PGP encrypted
   */
  filterPGPThreads(threads) {
    return threads.filter(function(thread) {
      for (var i = 0; i < thread.messages.length; i++) {
        var message = thread.messages[i];
        // Each email message has multiple message parts, usually one is HTML
        // formatted and the other is plaintext. Find the plaintext message.
        var messagePart = message.payload.parts.find(function(messagePart) {
          var plainTextHeader = messagePart.headers.find(function(header) {
            return header.name == 'Content-Type' &&
                   header.value.includes('text/plain');
          });
          return plainTextHeader !== undefined;
        });
        if (messagePart == undefined) {
          continue;
        }
        var encodedBody = new Buffer(messagePart.body.data, 'base64');
        if (pgp.containsPGPMessage(encodedBody.toString())) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Get the user's labels.
   * @return a Promise containing an array of strings.
   */
  listLabels() {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.labels.list({
        auth: this.oauth2Client,
        userId: 'me',
      }, function(err, response) {
        if (err) reject(err);
        var labels = response.labels;
        resolve(labels.map(function(label) { return label.name }));
      });
    }.bind(this));
  }
}

module.exports = GmailClient;
