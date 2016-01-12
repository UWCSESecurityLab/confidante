'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var EventEmitter = require('events').EventEmitter;
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var xhr = require('xhr');

var _plaintexts = {};
var _threads = {};
var _errors = {};
var _signers = {};

// A promise containing our local private key.
var _privateManager = keybaseAPI.getPrivateManager();

_privateManager.then(function(pm) {
  console.log(pm);
});

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
    .then(function(plaintext) {
      _plaintexts[message.id] = plaintext;

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
    if (!error) {
      _threads = JSON.parse(body);
      _threads.forEach(function(thread) {
        _decryptThread(thread);
      });
      MessageStore.emitChange();
    }
  }.bind(this));
}

loadMail();
setInterval(loadMail, 5000);

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
      plaintexts: _plaintexts
    };
  },

  markAsRead: function(threadId) {
    xhr.post({
      url: window.location.origin + '/markAsRead?threadId=' + threadId
    }, function(err, response, body) {
      if (err) {
        console.error(err);
      }
    });
  },

  // Remove this disable when the below function does something.
  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'MARK_AS_READ') {
      MessageStore.markAsRead(action.message);
      MessageStore.emitChange();
    }
  })
});

module.exports = MessageStore;
