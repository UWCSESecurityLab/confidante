'use strict';

var EventEmitter = require('events').EventEmitter;
const GmailClient = require('../../../gmailClient');
const GoogleOAuth = require('../../../googleOAuth');
var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var KeybaseAPI = require('../keybaseAPI');
var xhr = require('xhr');

let _contacts = [];
let _keybase = [];
let _onTokenizeSuccess = undefined;
let _onTokenizeError = undefined;

// TODO: Better token handling, client side authorization checks.
let token = GoogleOAuth.getAccessToken();
let gmail = new GmailClient(token.access_token);

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

  /**
   * Registers an event listener for when the send button in ComposeArea is
   * clicked. For resolving partial emails in ContactsAutocomplete before
   * sending a message.
   * @param callback The function that should be called when the send event
   *                 is fired. It should take two parameter: a function that
   *                 should be called once email address resolution is complete,
   *                 and a function that is called if that resolution failed.
   */
  addSendListener: function(callback) {
    this.on('SEND', function() {
      callback(_onTokenizeSuccess, _onTokenizeError);
    });
  },

  emitContactsChange: function() {
    this.emit('CONTACTS');
  },

  emitKeybaseChange: function() {
    this.emit('KEYBASE');
  },

  emitSend: function(onSuccess, onError) {
    _onTokenizeSuccess = onSuccess;
    _onTokenizeError = onError;
    this.emit('SEND');
  },

  getContacts: function() {
    return _contacts;
  },

  getKeybase: function() {
    return _keybase;
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'GET_CONTACTS') {
      gmail.searchContacts(action.query).then(function(contacts) {
        _contacts = contacts;
        AutocompleteStore.emitContactsChange();
      }).catch(function(err) {
        if (err !== 'Unsupported on web') {
          console.error(err);
        }
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
    } else if (action.type === 'FORCE_TOKENIZE') {
      AutocompleteStore.emitSend(action.onSuccess, action.onError);
    }
  })
});

module.exports = AutocompleteStore;
