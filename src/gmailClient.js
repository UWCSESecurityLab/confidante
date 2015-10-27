'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var pgp = require('./pgp.js');
var credentials = require('../client_secret.json');
var URLSafeBase64 = require('urlsafe-base64');

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
        if (err) {
          reject(err);
          return;
        }
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
        if (err) {
          reject(err);
          return;
        }
        if (response.threads === undefined) {
          resolve([]);
          return;
        }
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
        if (err) {
          reject(err);
          return;
        }
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
        if (message.payload.mimeType == 'text/plain') {
          var encodedBody = new Buffer(message.payload.body.data, 'base64');
          if (pgp.containsPGPMessage(encodedBody.toString())) {
            return true;
          }
        } else if (message.payload.mimeType = 'multipart/alternative') {
          // For multipart messages, we need to find the plaintext part to
          // search for PGP armor.
          var messagePart = message.payload.parts.find(function(messagePart) {
            return messagePart.mimeType == 'text/plain';
          });
          if (messagePart !== undefined) {
            var encodedBody = new Buffer(messagePart.body.data, 'base64');
            if (pgp.containsPGPMessage(encodedBody.toString())) {
              return true;
            }
          }
        }
      }
      return false;
    });
  }

  sendMessage(jsonMessage) {
    return new Promise(function(resolve, reject) {
      if (!jsonMessage.headers.from) {
        reject(new Error("Message missing \"From\" header"));
        return;
      }
      if (!jsonMessage.headers.to || jsonMessage.headers.to.length < 1) {
        reject(new Error("Message missing \"To\" header"));
        return;
      }
      if (!jsonMessage.headers.date) {
        reject(new Error("Message missing \"Date\" header"));
        return;
      }

      var rfcMessage = this.buildRfcMessage(jsonMessage);
      var encodedMessage = URLSafeBase64.encode(new Buffer(rfcMessage))

      google.gmail('v1').users.messages.send({
        auth: this.oauth2Client,
        userId: 'me',
        resource: {
          raw: encodedMessage
        }
      }, function(err, response) {
          if (err) {
            reject(err);
            return;
          }
          resolve(response);
        }
      );
    }.bind(this));
  }

  buildRfcMessage(jsonMessage) {
    var rfcMessage = [];
    rfcMessage.push('From: ' + jsonMessage.headers.from);
    rfcMessage.push('To: ' + jsonMessage.headers.to.join(', '));
    if (jsonMessage.headers.cc && jsonMessage.headers.cc.length > 0) {
      rfcMessage.push('Cc: ' + jsonMessage.headers.cc.join(', '));
    }
    if (jsonMessage.headers.bcc && jsonMessage.headers.bcc.length > 0) {
      rfcMessage.push('Bcc: ' + jsonMessage.headers.bcc.join(', '));
    }
    rfcMessage.push('Subject: ' + jsonMessage.headers.subject);
    rfcMessage.push('Date: ' + jsonMessage.headers.date);
    rfcMessage.push('');
    rfcMessage.push(jsonMessage.body);

    return rfcMessage.join('\r\n');
  }
}

module.exports = GmailClient;
