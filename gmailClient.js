'use strict';
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var credentials = require('./client_secret.json');

// Strings used to build PGP Armor
var ARMOR_LINE = '-----';
var ARMOR_TYPES = [
  'BEGIN PGP ',
  'END PGP ',
  'MESSAGE ',
  'PUBLIC KEY BLOCK ',
  'PRIVATE KEY BLOCK',
  'SIGNATURE '
];

function header(type) {
  return ARMOR_LINE + BEGIN + type + ARMOR_LINE;
}
function footer(type) {
  return ARMOR_LINE + END + type + ARMOR_LINE
}

function containsPGPArmor(text) {
  for (var i = 0; i < ARMOR_TYPES.length; i++) {
    if (text.includes(header(type) && text.includes(footer(type)))) {
      return true;
    }
  }
  return false;
}

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
   * Removes all non-PGP encrypted messages from an array of messages.
   * @param messages Array of Gmail messages
   * @return Array of Gmail messages that are PGP encrypted
   */
  filterPGPMessages(messages) {
    return messages.filter(function(message) {
      // Each email message has multiple message parts, usually one is HTML
      // formatted and the other is plaintext. Find the plaintext message.
      var messagePart = message.payload.parts.find(function(messagePart) {
        var plainTextHeader = messagePart.headers.find(function(header) {
          return header.name == 'Content-Type' &&
                 header.value.includes('text/plain');
        });
        return plainTextHeader !== undefined;
      });

      var encodedBody = new Buffer(messagePart.body.data, 'base64');
      return containsPGPArmor(encodedBody.toString());
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
