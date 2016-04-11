'use strict';

var EventEmitter = require('events').EventEmitter;
var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var KeybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var xhr = require('xhr');

var _plaintexts = {};
var _threads = {};
var _errors = {};
var _signers = {};
var _linkids = {};
var _netError = '';
var _mailbox = 'INBOX';

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
          console.log('Error looking up user by fingerprint');
          console.log(error);
        });
      }

      delete _errors[message.id];
      MessageStore.emitChange();
    }).catch(function(err) {
      _errors[message.id] = err;
      MessageStore.emitChange();
    });
}

function getMail(mailbox) {
  xhr.get({
    url: window.location.origin + '/getMail?mailbox=' + mailbox
  }, function(error, response, body) {
    if (error) {
      _netError = 'NETWORK';
      MessageStore.emitChange();
    } else if (response.statusCode == 401) {
      _netError = 'AUTHENTICATION';
      MessageStore.emitChange();
    } else {
      _netError = '';
      _threads = JSON.parse(body);
      _threads.forEach(function(thread) {
        _decryptThread(thread);
        _getLinkIDsForThread(thread);
      });
      MessageStore.emitChange();
    }
  }.bind(this));
}

getMail(_mailbox);
setInterval(getMail, 60000, _mailbox);

var MessageStore = Object.assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit('CHANGE');
  },
  addChangeListener: function(callback) {
    this.on('CHANGE', callback);
  },
  removeChangeListener: function(callback) {
    this.removeListener('CHANGE', callback);
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

  getNetError: function() {
    return _netError;
  },

  markAsRead: function(threadId) {
    xhr.post({
      url: window.location.origin + '/markAsRead?threadId=' + threadId
    }, function(err, response) {
      if (err) {
        _netError = 'NETWORK';
        console.err(err);
        MessageStore.emitChange();
      } else if (response.statusCode != 200) {
        _netError = 'AUTHENTICATION';
        MessageStore.emitChange();
      } else {
        _netError = '';
      }
      getMail(_mailbox);
    });
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'MARK_AS_READ') {
      MessageStore.markAsRead(action.message);
    } else if (action.type === 'REFRESH') {
      getMail(_mailbox);
    } else if (action.type === 'CHANGE_MAILBOX') {
      _mailbox = action.mailbox;
      getMail(_mailbox);
    }
  })
});

module.exports = MessageStore;
