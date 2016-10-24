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
  _privateManager
    .then(KeybaseAPI.decrypt(body))
    .then(function(literals) {
      _plaintexts[message.id] = literals[0].toString();
      let signer = _signerFromLiterals(literals);
      if (signer) {
        let fingerprint = signer.pgp.get_fingerprint().toString('hex');
        KeybaseAPI.userLookup(fingerprint).then(function(response) {
          if (response.status.name === 'OK') {
            _signers[message.id] = signer;
            _signers[message.id].user = response.them;
            MessageStore.emitChange();
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

function _archiveThread(threadId) {
  xhr.post({
    url: window.location.origin + '/archiveThread?threadId=' + threadId
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

  setChecked: function(threadId, checked) {
    _threads.forEach((thread) => {
      if (thread.id === threadId) {
        thread['checked'] = checked;
      }
    });
    MessageStore.emitChange();
  },

  archiveSelectedThreads: function() {
    _threads.forEach((thread) => {
      if (thread.checked) {
        _archiveThread(thread.id);
      }
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
    } else if (action.type === 'ARCHIVE_SELECTED_THREADS') {
      MessageStore.archiveSelectedThreads();
    } else if (action.type === 'SET_CHECKED') {
      MessageStore.setChecked(action.message.threadId, action.message.checked);
    }
  })
});

MessageStore.fetchFirstPage();
setInterval(MessageStore.refreshCurrentPage, 60000);

module.exports = MessageStore;
