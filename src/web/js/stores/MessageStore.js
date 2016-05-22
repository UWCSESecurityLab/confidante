'use strict';

var EventEmitter = require('events').EventEmitter;
var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var KeybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var queryString = require('query-string');
var xhr = require('xhr');

var _threads = {};
var _mailbox = 'INBOX';

var _pageIndex = 0;
var _pageTokens = [];

var _plaintexts = {};
var _signers = {};

var _linkids = {};

var _errors = {};
var _netError = '';

let decryptStart = 0;
let decryptEnd = 0;
let decryptCount = 0;
// let messageIds = [];

// A promise containing our local private key.
var _privateManager = KeybaseAPI.getPrivateManager();

_privateManager.then(function(pm) {
  console.log(pm);
});

function _signerFromLiterals(literals) {
  let ds = literals[0].get_data_signer();
  let km;
  if (ds) {
    km = ds.get_key_manager();
  }
  if (km) {
    return km;
  }
  return null;
}

/**
 * Parse out the linkids for all messages in the thread.
 * @param thread The thread to parse linkids out of.
 */
function _getLinkIDsForThread(thread) {
  thread.messages.forEach(function(message) {
    if (_linkids[message.id] === undefined) {
      _getLinkIDForMessage(message);
    }
  });
}

/**
 * Parse out the linkid from the first line of a message.
 * @param firstLine The first (plaintext) line of a message, containing a link
 * that includes the linkid in a fragment.
 */
function _getLinkIDFromFirstLine(firstLine) {
  let linkIDRegex = /#linkid:(.+)/;
  let match = linkIDRegex.exec(firstLine);
  if (match && match.length === 2) {
    return match[1];
  } else {
    return null;
  }
}

/**
 * Parse out the link id for a message and store it in _linkids.
 * @param message The message to parse it out from.
 */
function _getLinkIDForMessage(message) {
  let body = messageParsing.getMessageBody(message);
  let firstLine = body.split('\n')[0];
  let linkid = _getLinkIDFromFirstLine(firstLine);
  _linkids[message.id] = linkid;
}

function _decryptThread(thread) {
  thread.messages.forEach(function(message) {
    if (_plaintexts[message.id] === undefined) {
      _decryptMessage(message);
    }
  });
}

function _decryptMessage(message) {
  var body = messageParsing.getMessageBody(message);
  let keybaseAPI = new KeybaseAPI(message.id);
  _privateManager
    .then(keybaseAPI.decrypt(body))
    .then(function(literals) {
      _plaintexts[message.id] = literals[0].toString();
      let signer = _signerFromLiterals(literals);
      if (signer) {
        let fingerprint = signer.pgp.get_fingerprint().toString('hex');
        keybaseAPI.userLookup(fingerprint).then(function(response) {
          console.log((keybaseAPI.decryptTime - keybaseAPI.keyFetchTime) + '\n' +
                      keybaseAPI.keyFetchTime + '\n' +
                      keybaseAPI.profileFetchTime + '\n' +
                      (keybaseAPI.decryptTime + keybaseAPI.profileFetchTime));

          if (response.status.name === 'OK') {
            _signers[message.id] = signer;
            _signers[message.id].user = response.them;
            MessageStore.emitChange();
            decryptEnd = performance.now();
            decryptCount++;
            if (decryptCount == 30) {
              console.log("Total time:");
              console.log(decryptEnd - decryptStart);
            } else {
              console.log("Elapsed time (" + decryptCount + "/30):");
              console.log(decryptEnd - decryptStart);
            }

            // let ptLengths = messageIds.map(function(id) {
            //   if (_plaintexts[id])
            //     return _plaintexts[id].length;
            //   else
            //     return 0;
            // });
            // console.log(ptLengths);
          }
        }).catch(function(error) {
          console.error('Error looking up user by fingerprint');
          console.error(error);
        });
      }

      delete _errors[message.id];
      MessageStore.emitChange();
    }).catch(function(err) {
      _errors[message.id] = err;
      MessageStore.emitChange();
    });
}

var MessageStore = Object.assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit('CHANGE');
  },
  emitRefreshing: function() {
    this.emit('REFRESH');
  },

  addChangeListener: function(callback) {
    this.on('CHANGE', callback);
  },
  removeChangeListener: function(callback) {
    this.removeListener('CHANGE', callback);
  },
  addRefreshListener: function(callback) {
    this.on('REFRESH', callback);
  },

  getPrivateManager: function() {
    return _privateManager;
  },

  getAll: function() {
    return {
      errors: _errors,
      threads: _threads,
      plaintexts: _plaintexts,
      signers: _signers,
      linkids: _linkids
    };
  },

  getCurrentMailboxLabel: function() {
    return _mailbox;
  },

  getDisablePrev: function() {
    return _pageIndex == 0;
  },

  getDisableNext: function() {
    return _pageIndex + 1 >= _pageTokens.length;
  },

  getNetError: function() {
    return _netError;
  },

  /**
   * Fetch PGP email threads from Gmail.
   * @param mailbox The mailbox label to get emails from
   * @param pageToken Which page of emails to get. Pass empty string for the first.
   * @param callback Takes one parameter, the next page token
   */
  fetchMail(mailbox, pageToken, callback) {
    MessageStore.emitRefreshing();

    let query = queryString.stringify({
      mailbox: mailbox,
      pageToken: pageToken
    });

    xhr.get({
      url: window.location.origin + '/getMail?' + query
    }, function(error, response, body) {
      if (error) {
        _netError = 'NETWORK';
        MessageStore.emitChange();
      } else if (response.statusCode == 401) {
        _netError = 'AUTHENTICATION';
        MessageStore.emitChange();
      } else if (response.statusCode == 500) {
        _netError = 'INTERNAL ERROR';
        MessageStore.emitChange();
      } else {
        _netError = '';
        let data = JSON.parse(body);
        _threads = data.threads;

        // let messageLengths = [];
        // messageIds = [];
        // _threads.forEach(function(thread) {
        //   let lengths = thread.messages.map(function(message) {
        //     messageIds.push(message.id);
        //     return message.payload.body.data.length;
        //   });
        //   messageLengths = messageLengths.concat(lengths);
        // });
        //
        // console.log(messageLengths);


        decryptStart = performance.now();
        _threads.forEach(function(thread) {
          _decryptThread(thread);
          _getLinkIDsForThread(thread);
        });
        if (callback && data.nextPageToken != '') {
          callback(data.nextPageToken);
        }
      }
    }.bind(this));
  },

  fetchFirstPage: function() {
    MessageStore.fetchMail(_mailbox, '', (nextPageToken) => {
      _pageTokens = [undefined];
      if (nextPageToken) {
        _pageTokens.push(nextPageToken);
      }
      _pageIndex = 0;
      MessageStore.emitChange();
    });
  },

  fetchNextPage: function() {
    if (_pageIndex < _pageTokens.length - 1) {
      _pageIndex++;
      MessageStore.fetchMail(_mailbox, _pageTokens[_pageIndex], (nextPageToken) => {
        _pageTokens.push(nextPageToken);
        MessageStore.emitChange();
      });
    }
  },

  fetchPrevPage: function() {
    if (_pageIndex > 0) {
       // Slice off the last token before moving the index back.
      _pageTokens.slice(0, _pageIndex + 1);
      _pageIndex--;
      MessageStore.fetchMail(_mailbox, _pageTokens[_pageIndex], () => {
        MessageStore.emitChange();
      });
    }
  },

  refreshCurrentPage: function() {
    MessageStore.fetchMail(_mailbox, _pageTokens[_pageIndex], () => {
      MessageStore.emitChange();
    });
  },

  markAsRead: function(threadId) {
    xhr.post({
      url: window.location.origin + '/markAsRead?threadId=' + threadId
    }, function(err, response) {
      if (err) {
        _netError = 'NETWORK';
        console.error(err);
        MessageStore.emitChange();
      } else if (response.statusCode != 200) {
        _netError = 'AUTHENTICATION';
        MessageStore.emitChange();
      } else {
        _netError = '';
      }
      MessageStore.refreshCurrentPage();
    });
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'MARK_AS_READ') {
      MessageStore.markAsRead(action.message);
    } else if (action.type === 'REFRESH') {
      MessageStore.refreshCurrentPage();
    } else if (action.type === 'CHANGE_MAILBOX') {
      _mailbox = action.mailbox;
      MessageStore.fetchFirstPage();
    } else if (action.type === 'NEXT_PAGE') {
      MessageStore.fetchNextPage();
    } else if (action.type === 'PREV_PAGE') {
      MessageStore.fetchPrevPage();
    }
  })
});

MessageStore.fetchFirstPage();
setInterval(MessageStore.refreshCurrentPage, 60000);

module.exports = MessageStore;
