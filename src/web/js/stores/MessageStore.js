'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var EventEmitter = require('events').EventEmitter;
var keybaseAPI = require('../keybaseAPI');
var messageParsing = require('../messageParsing');
var request = require('request');

var _plaintexts = {};
var _threads = {};
var _errors = {};

// A promise containing our local private key.
var _privateManager = keybaseAPI.getPrivateManager();

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
  request({
    method: 'GET',
    url: window.location.origin + '/inbox'
  },
  function(error, response, body) {
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

  getAll: function() {
    return {
      errors: _errors,
      threads: _threads,
      plaintexts: _plaintexts
    };
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    // Respond to some actions.
  })
});

module.exports = MessageStore;
