'use strict';

var EventEmitter = require('events').EventEmitter;
var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var KeybaseAPI = require('../keybaseAPI');
var xhr = require('xhr');

let _contacts = [];
let _keybase = [];

function simplifyKeybaseResults(kb) {
  return kb.completions.map(function(completion) {
    // Parse the autocomplete profile into a simpler object
    // representing the user and their attributes.
    let user = {};
    for (var component in completion.components) {
      if (completion.components.hasOwnProperty(component) &&
          component != 'websites') {
        user[component] = completion.components[component].val;
      }
    }
    user.picture = completion.thumbnail;
    return user;
  });
}

var AutocompleteStore = Object.assign({}, EventEmitter.prototype, {

  addContactsListener: function(callback) {
    this.on('CONTACTS', callback);
  },
  addKeybaseListener: function(callback) {
    this.on('KEYBASE', callback);
  },
  emitContactsChange: function() {
    this.emit('CONTACTS');
  },
  emitKeybaseChange: function() {
    this.emit('KEYBASE');
  },
  getContacts: function() {
    return _contacts;
  },
  getKeybase: function() {
    return _keybase;
  },

  fetchContacts: function(query) {
    return new Promise(function(resolve, reject) {
      xhr.get({
        url: window.location.origin + '/contacts.json?q=' + query
      }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          resolve(JSON.parse(body));
        } else {
          reject(error);
        }
      });
    });
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'GET_CONTACTS') {
      AutocompleteStore.fetchContacts(action.query).then(function(contacts) {
        _contacts = contacts;
        AutocompleteStore.emitContactsChange();
      }).catch(function(err) {
        console.error(err);
      });
    } else if (action.type === 'GET_KEYBASE') {
      KeybaseAPI.autocomplete(action.query).then(function(kb) {
        _keybase = simplifyKeybaseResults(kb);
        AutocompleteStore.emitKeybaseChange();
      }).catch(function(err) {
        console.error(err);
      });
    } else if (action.type === 'CLEAR_AUTOCOMPLETIONS') {
      _contacts = [];
      _keybase = [];
      AutocompleteStore.emitKeybaseChange();
      AutocompleteStore.emitContactsChange();
    }
  })
});

module.exports = AutocompleteStore;
