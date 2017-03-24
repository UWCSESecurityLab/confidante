'use strict';

const EventEmitter = require('events').EventEmitter;
const flags = require('../../../flags');
const GmailClient = require('../../../gmailClient');
const GoogleOAuth = require('../../../googleOAuth');
const InboxDispatcher = require('../dispatcher/InboxDispatcher');
const KeybaseAPI = require('../keybaseAPI');
const messageParsing = require('../messageParsing');

// Only zero or one thread can be open at a time -- the open thread, if any,
// is stored here.
let _currentFullThreadId = undefined;
let _checkedThreads = {};

// Thread/message state
let _threads = [];
let _plaintexts = {};
let _signers = {};
let _messageErrors = {};
let _linkids = {};

let _mailbox = 'INBOX';

let _pageIndex = 0;
let _pageTokens = [];

let _globalError = null;

// A promise containing our local private key.
let _privateManager = KeybaseAPI.getPrivateManager();

let token = GoogleOAuth.getAccessToken();
let gmail = new GmailClient(token.access_token);

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
  let body = messageParsing.getMessageBody(message);
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

      delete _messageErrors[message.id];
      MessageStore.emitChange();
    }).catch(function(err) {
      _messageErrors[message.id] = err;
      MessageStore.emitChange();
    });
}

/**
 * Archive a thread by threadID. Unfortunately, GMail's API doesn't seem
 * to allow batch archiving, so we do it one at a time.
 */
function _archiveThread(threadId) {
  gmail.archiveThread(threadId).then(function() {
    MessageStore.refreshCurrentPage();
  }).catch(function(error) {
    MessageStore.updateGlobalError(error);
    MessageStore.refreshCurrentPage();
  });
}

let MessageStore = Object.assign({}, EventEmitter.prototype, {
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

  getInboxState: function() {
    return {
      errors: _messageErrors,
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

  getGlobalError: function() {
    return _globalError;
  },

  getExpandedThreadId: function() {
    return _currentFullThreadId;
  },

  isThreadChecked: function(threadId) {
    return _checkedThreads[threadId] === true;
  },

  /**
   * Fetch PGP email threads from Gmail.
   * @param mailbox The mailbox label to get emails from
   * @param pageToken Which page of emails to get. Pass empty string for the first.
   * @param callback Takes one parameter, the next page token
   */
  fetchMail(mailbox, pageToken, callback) {
    MessageStore.emitRefreshing();

    gmail.getEncryptedMail(mailbox, pageToken).then(function(response) {
      _threads = response.threads;
      _threads.forEach(function(thread) {
        _decryptThread(thread);
        _getLinkIDsForThread(thread);
      });
      if (callback && response.nextPageToken != '') {
        callback(response.nextPageToken);
      }
    }).catch(function(error) {
      MessageStore.updateGlobalError(error);
    });
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
    _checkedThreads[threadId] = checked;
    MessageStore.emitChange();
  },

  setExpandedThread: function(threadId, expanded) {
    if (expanded) {
      _currentFullThreadId = threadId;
    } else {
      _currentFullThreadId = undefined;
    }

    MessageStore.emitChange();
  },

  archiveSelectedThreads: function() {
    _threads.forEach((thread) => {
      if (this.isThreadChecked(thread.id)) {
        _archiveThread(thread.id);
      }
    });
  },

  deleteSelectedThreads: function() {
    _threads.forEach((thread) => {
      if (this.isThreadChecked(thread.id)) {
        gmail.deleteThread(thread.id);
      }
    });
  },

  markAsRead: function(threadId) {
    gmail.markAsRead(threadId).then(function() {
      MessageStore.refreshCurrentPage();
    }).catch(function(error) {
      MessageStore.updateGlobalError(error);
      MessageStore.refreshCurrentPage();
    });
  },

  updateGlobalError: function(error) {
    if (error) {
      console.error(error);
    }
    _globalError = error;
    MessageStore.emitChange();
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
    } else if (action.type === 'DELETE_SELECTED_THREADS') {
      MessageStore.deleteSelectedThreads();
    } else if (action.type === 'SET_CHECKED') {
      MessageStore.setChecked(action.message.threadId, action.message.checked);
    } else if (action.type === 'SET_EXPANDED_THREAD') {
      MessageStore.setExpandedThread(action.message.threadId, action.message.expanded);
    }
  })
});

MessageStore.fetchFirstPage();
setInterval(MessageStore.refreshCurrentPage, 60000);

if (!flags.ELECTRON) {
  setInterval(function() {
    GoogleOAuth.web.validateToken(token.access_token).catch(function(err) {
      MessageStore.updateGlobalError(err);
    });
  }, 20000);
}

module.exports = MessageStore;
