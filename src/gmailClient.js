'use strict';

const AuthError = require('./error').AuthError;
const flags = require('./flags.js');
const InputError = require('./error').InputError;
const messageParsing = require('./web/js/messageParsing');
const NetworkError = require('./error').NetworkError;
const pgp = require('./pgp.js');
const qs = require('querystring');
const UnsupportedError = require('./error').UnsupportedError;
const URLSafeBase64 = require('urlsafe-base64');
const xhr = require('xhr');

// TODO: Check response codes, provide useful errors
class GmailClient {
  /**
   * Constructs a new authenticated Gmail Client.
   * @param token The token object provided by the Google OAuth library.
   */
  constructor(token) {
    this.token = token;
  }

  request(method, options) {
    return new Promise(function(resolve, reject) {
      if (!options || !options.url) {
        reject(new InputError('Invalid request: missing URL'));
        return;
      }
      let headers = { Authorization: 'Bearer ' + this.token };
      Object.assign(headers, options.headers);
      xhr({
        method: method,
        url: options.query ? options.url + '?' + qs.stringify(options.query) : options.url,
        headers: headers,
        json: true,
        body: options.body
      }, function(error, response, body) {
        if (error) {
          reject(new NetworkError(error));
        } else {
          if (body.error) {
            if (body.error.code === 401) {
              reject(new AuthError(body.error.message));
            }
          }
          resolve(body);
        }
      });
    }.bind(this));
  }

  get(options) {
    return this.request('GET', options);
  }

  post(options) {
    return this.request('POST', options);
  }

  /**
   * Get the authenticated user's email address.
   * @return a Promise containing the email address as a string.
   */
  getEmailAddress() {
    return new Promise(function(resolve, reject) {
      this.get({
        url: 'https://www.googleapis.com/gmail/v1/users/me/profile'
      }).then(function(response) {
        resolve(response.emailAddress);
      }).catch(function(err) {
        reject(err);
      });
    }.bind(this));
  }

  getName() {
    return new Promise(function(resolve, reject) {
      this.get({
        url: 'https://www.googleapis.com/plus/v1/people/me',
        query: {fields: 'displayName'}
      }).then(function(response) {
        resolve(response.displayName);
      }).catch(function(err) {
        reject(err);
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
      maxResults: 25,
      pageToken: pageToken,
      q: 'BEGIN PGP MESSAGE'
    };
    if (mailbox != '') {
      params.labelIds = mailbox;
    }

    return new Promise(function(resolve, reject) {
      this.get({
        url: 'https://www.googleapis.com/gmail/v1/users/me/threads',
        query: params
      }).then(function(response) {
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
        }.bind(this));
      }.bind(this))
      .catch(reject);
    }.bind(this));
  }

  getThread(id) {
    return this.get({
      url: 'https://www.googleapis.com/gmail/v1/users/me/threads/' + id
    });
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

  sendMessage(message) {
    if (!message.to) {
      return Promise.reject(new InputError('Missing recipients'));
    }

    return new Promise(function(resolve, reject) {
      // TODO: Cache the name and email address and retrieve it more elegantly
      Promise.all([this.getEmailAddress(), this.getName()]).then(function(fromData) {
        let parentId = messageParsing.getMessageHeader(message.parentMessage, 'Message-ID');
        let parentReferences = messageParsing.getMessageHeader(message.parentMessage, 'References');
        let ourReferences = [parentReferences, parentId].join(' ');

        let from;
        let address = fromData[0];
        let name = fromData[1];
        if (!name || name === '') {
          from = address;
        } else {
          from = name + ' <' + address + '>';
        }
        let headers = {
          to: message.to,
          from: from,
          subject: message.subject,
          date: new Date().toString(),
          inReplyTo: parentId,
          references: ourReferences
        };

        var rfcMessage = this.buildRfcMessage(headers, message.body);
        var encodedMessage = URLSafeBase64.encode(new Buffer(rfcMessage));
        console.log(message);
        this.post({
          url: 'https://www.googleapis.com/gmail/v1/users/me/messages/send',
          body: {
            raw: encodedMessage,
            threadId: message.parentMessage.threadId
          }
        }).then(function(response) {
          resolve(response);
        }).catch(function(err) {
          reject(err);
        });
      }.bind(this));
    }.bind(this));
  }

  archiveThread(threadId) {
    return this.post({
      url: 'https://www.googleapis.com/gmail/v1/users/me/threads/' + threadId + '/modify',
      body: {
        removeLabelIds: [
          'INBOX'
        ]
      }
    });
  }

  markAsRead(threadId) {
    return this.post({
      url: 'https://www.googleapis.com/gmail/v1/users/me/threads/' + threadId + '/modify',
      body: {
        removeLabelIds: [
          'UNREAD'
        ]
      }
    });
  }

  buildRfcMessage(headers, body) {
    var rfcMessage = [];
    rfcMessage.push('From: ' + headers.from);
    rfcMessage.push('To: ' + headers.to);
    if (headers.cc && headers.cc.length > 0) {
      rfcMessage.push('Cc: ' + headers.cc.join(', '));
    }
    if (headers.bcc && headers.bcc.length > 0) {
      rfcMessage.push('Bcc: ' + headers.bcc.join(', '));
    }
    if (headers.inReplyTo) {
      rfcMessage.push('In-Reply-To: ' + headers.inReplyTo);
    }
    if (headers.references) {
      rfcMessage.push('References: ' + headers.references);
    }
    if (headers.contentType) {
      rfcMessage.push('Content-Type: ' + headers.contentType);
    }

    rfcMessage.push('Subject: ' + headers.subject);
    rfcMessage.push('Date: ' + headers.date);
    rfcMessage.push('');
    rfcMessage.push(body);

    return rfcMessage.join('\r\n');
  }

  searchContacts(query) {
    if (!flags.ELECTRON) {
      return Promise.reject(new UnsupportedError(
        'Google Contacts is not supported in the web demo.'
      ));
    }

    if (query.length < 2) {
      return Promise.resolve([]);
    }
    return new Promise(function(resolve, reject) {
      this.get({
        url: 'https://www.google.com/m8/feeds/contacts/default/full',
        headers: {
          'GData-Version': 3.0
        },
        query: {
          'alt': 'json',
          'max-results': 10,
          'q': query
        }
      }).then(function(response) {
        let contacts = response['feed']['entry'];
        if (!contacts) {
          resolve([]);
          return;
        }
        resolve(contacts.map(this.toSmallContact).reduce(function(flat, next) {
          return flat.concat(next);
        }));
      }).catch(function(err) {
        reject(err);
      });
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
