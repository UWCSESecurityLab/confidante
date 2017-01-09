'use strict';

var google = require('googleapis');
var GoogleOAuth = require('./googleOAuth.js');
var pgp = require('./pgp.js');
var request = require('request');
var URLSafeBase64 = require('urlsafe-base64');

class GmailClient {
  /**
   * Constructs a new authenticated Gmail Client.
   * @param token The token object provided by the Google OAuth library.
   */
  constructor(token) {
    this.oauth2Client = GoogleOAuth.buildClient();
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

  getName() {
    return new Promise(function(resolve, reject) {
      google.plus('v1').people.get({
        auth: this.oauth2Client,
        fields: ['displayName'],
        userId: 'me'
      }, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response.displayName);
        }
      });
    }.bind(this));
  }

  /**
   * Returns PGP encrypted threads from the specified mailbox.
   * @param mailbox {string} The mailbox to retrieve encrypted mail from.
   * @param pageToken {number|string} The page of emails to start at.
   * @return {object} response
   * @return {Array} response.threads An array of encrypted threads
   * @return {number} response.nextPageToken The page token for the next page
   * of emails, if there are more available. Otherwise not present.
   */
  getEncryptedMail(mailbox, pageToken) {
    let params = {
      auth: this.oauth2Client,
      maxResults: 25,
      pageToken: pageToken,
      q: 'BEGIN PGP MESSAGE',
      userId: 'me'
    };
    if (mailbox != '') {
      params.labelIds = mailbox;
    }

    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.list(params, function(err, response) {
        if (err) {
          reject(err);
          return;
        }
        if (response.threads === undefined) {
          resolve({ threads: [] });
          return;
        }
        var threadRequestPromises = [];
        response.threads.forEach(function(threadSnippet) {
          threadRequestPromises.push(this.getThread(threadSnippet.id));
        }, this);
        Promise.all(threadRequestPromises).then(function(threads) {
          let filtered = this.filterPGPThreads(threads);
          // By default, Gmail returns threads ordered by when the thread was
          // created. Sort by when the last message in the thread was sent.
          filtered.sort(function(a, b) {
            return b.messages[b.messages.length - 1].internalDate -
                   a.messages[a.messages.length - 1].internalDate;
          });
          resolve({
            threads: filtered,
            nextPageToken: response.nextPageToken
          });
        }.bind(this)).catch(function(error) {
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
        if (message.payload.mimeType.startsWith('multipart/')) {
          // For multipart messages, we need to find the plaintext part to
          // search for PGP armor.
          var messagePart = message.payload.parts.find(function(messagePart) {
            return messagePart.mimeType == 'text/plain';
          });
          if (messagePart !== undefined) {
            let encodedBody = new Buffer(messagePart.body.data, 'base64');
            if (pgp.containsPGPMessage(encodedBody.toString())) {
              return true;
            }
          }
        } else {
          let encodedBody = new Buffer(message.payload.body.data, 'base64');
          if (pgp.containsPGPMessage(encodedBody.toString())) {
            return true;
          }
        }
      }
      return false;
    });
  }

  sendMessage(jsonMessage, threadId) {
    return new Promise(function(resolve, reject) {
      if (!jsonMessage.headers.from) {
        reject(new Error('Message missing \"From\" header'));
        return;
      }
      if (!jsonMessage.headers.to || jsonMessage.headers.to.length < 1) {
        reject(new Error('Message missing \"To\" header'));
        return;
      }
      if (!jsonMessage.headers.date) {
        reject(new Error('Message missing \"Date\" header'));
        return;
      }
      var rfcMessage = this.buildRfcMessage(jsonMessage);
      var encodedMessage = URLSafeBase64.encode(new Buffer(rfcMessage));
      google.gmail('v1').users.messages.send({
        auth: this.oauth2Client,
        userId: 'me',
        resource: {
          raw: encodedMessage,
          threadId: threadId
        }
      }, function(err, response) {
        if (err) {
          console.log('Error sending message: ' + err);
          reject(err);
          return;
        }
        resolve(response);
      });
    }.bind(this));
  }

  /**
   * Actually trashes, as recommended by Google's docs. 
   * This is an interesting design point given privacy needs of users.
   */
  deleteThread(threadId) {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.trash({
        auth: this.oauth2Client,
        userId: 'me',
        id: threadId,
      }, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    }.bind(this));
  }

  archiveThread(threadId) {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.modify({
        auth: this.oauth2Client,
        userId: 'me',
        id: threadId,
        resource: {
          'removeLabelIds': [
            'INBOX'
          ]
        }
      }, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    }.bind(this));
  }

  markAsRead(threadId) {
    return new Promise(function(resolve, reject) {
      google.gmail('v1').users.threads.modify({
        auth: this.oauth2Client,
        userId: 'me',
        id: threadId,
        resource: {
          'removeLabelIds': [
            'UNREAD'
          ]
        }
      }, function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
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
    if (jsonMessage.headers.inReplyTo) {
      rfcMessage.push('In-Reply-To: ' + jsonMessage.headers.inReplyTo);
    }
    if (jsonMessage.headers.references) {
      rfcMessage.push('References: ' + jsonMessage.headers.references);
    }
    if (jsonMessage.headers.contentType) {
      rfcMessage.push('Content-Type: ' + jsonMessage.headers.contentType);
    }

    rfcMessage.push('Subject: ' + jsonMessage.headers.subject);
    rfcMessage.push('Date: ' + jsonMessage.headers.date);
    rfcMessage.push('');
    rfcMessage.push(jsonMessage.body);

    return rfcMessage.join('\r\n');
  }

  searchContacts(query) {
    return new Promise(function(resolve, reject) {
      if (query.length < 2) {
        resolve([]);
        return;
      }
      request({
        method: 'GET',
        url: 'https://www.google.com/m8/feeds/contacts/default/full',
        headers: {
          'GData-Version': 3.0,
          'Authorization': 'Bearer ' + this.oauth2Client.credentials.access_token
        },
        qs: {
          'alt': 'json',
          'max-results': 10,
          'q': query
        }
      }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          let raw = JSON.parse(body);
          let contacts = raw['feed']['entry'];
          if (!contacts) {
            resolve([]);
            return;
          }
          resolve(contacts.map(this.toSmallContact)
          .reduce(function(flat, next) {
            return flat.concat(next);
          }));
        } else {
          reject(body);
        }
      }.bind(this));
    }.bind(this));
  }

  /**
   * Converts a GData contact to a simple JSON object with the contact's name
   * and email address. Since there may be multiple email addresses, it returns
   * one or more objects in an array.
   */
  toSmallContact(gDataContact) {
    let emails = gDataContact['gd$email'];
    if (!emails) {
      return [];
    }

    let name = gDataContact['title']['$t'];
    if (!name) {
      name = '';
    }

    return emails.map(function(email) {
      return {
        name: name,
        email: email.address
      };
    });
  }
}

module.exports = GmailClient;
