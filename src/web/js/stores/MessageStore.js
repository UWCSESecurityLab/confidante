'use strict';

var EventEmitter = require('events').EventEmitter;
var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var xhr = require('xhr');

var _plaintexts = {};
var _threads = {};
var _errors = {};
var _signers = {};
var _netError = '';

// A promise containing our local private key.
var _privateManager = keybaseAPI.getPrivateManager();

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
    .then(keybaseAPI.decrypt(body))
    .then(function(literals) {
      _plaintexts[message.id] = literals[0].toString();
      _signers[message.id] = _signerFromLiterals(literals);

      if (_signers[message.id]) {
        let fingerprint = _signers[message.id].pgp.get_fingerprint().toString('hex');
        keybaseAPI.userLookup(fingerprint).then(function(response) {
          if (response.status.name === 'OK') {
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

function loadMail() {
  xhr.get({
    url: window.location.origin + '/inbox'
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
      });
      MessageStore.emitChange();
    }
  }.bind(this));
}

loadMail();
setInterval(loadMail, 60000);

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
      signers: _signers
    };
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
      loadMail();
    });
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'MARK_AS_READ') {
      MessageStore.markAsRead(action.message);
      MessageStore.emitChange();
    } else if (action.type === 'REFRESH') {
      loadMail();
    }
  })
});

module.exports = MessageStore;
