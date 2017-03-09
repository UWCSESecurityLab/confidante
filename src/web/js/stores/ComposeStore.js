'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var _replyAll = false;
var _inReplyTo = {};
var _invite = false;
var _keybaseUsername = '';
var _subject = '';
var _email = '';
var _signPrivate = true;
var _displayCompose = false;

var ComposeStore = assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit('CHANGE');
  },

  emitReset: function() {
    this.emit('RESET');
  },

  addChangeListener: function(callback) {
    this.on('CHANGE', callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener('CHANGE', callback);
  },

  addResetListener: function(callback) {
    this.on('RESET', callback);
  },

  removeResetListener: function(callback) {
    this.removeListener('RESET', callback);
  },

  getReply: function() {
    return _inReplyTo;
  },

  getReplyAll: function() {
    return _replyAll;
  },

  getInvite: function() {
    return _invite;
  },

  getKeybaseUsername: function() {
    return _keybaseUsername;
  },

  getSubject: function() {
    return _subject;
  },

  getEmail: function() {
    return _email;
  },

  getSignPrivate: function() {
    return _signPrivate;
  },

  getDisplayCompose: function() {
    return _displayCompose;
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'SET_IN_REPLY_TO') {
      _replyAll = action.message.replyAll;
      _inReplyTo = action.message.messageInfo;
      _invite = false;
      ComposeStore.emitChange();
    } else if (action.type === 'SET_INVITE') {
      _inReplyTo = {};
      _invite = action.message;
      ComposeStore.emitChange();
    } else if (action.type === 'RESET_FIELDS') {
      _inReplyTo = {};
      _replyAll = false;
      _invite = false;
      _subject = '';
      _email = '';
      _signPrivate = true;
      ComposeStore.emitReset();
    } else if(action.type === 'SET_COMPOSE_CONTENTS') {
      // required for the drafts feature, not used yet
      _replyAll = action.message.replyAll;
      _inReplyTo = action.message.messageInfo;
      _keybaseUsername = action.message.keybaseUsername;
      _subject = action.message.subject;
      _email = action.message.email;
      _signPrivate = action.message.signPrivate;
      ComposeStore.emitChange();
    } else if(action.type === 'SET_COMPOSE_ON') {
      _displayCompose = true;
      ComposeStore.emitChange();
    } else if(action.type === 'SET_COMPOSE_CLOSE') {
      _displayCompose = false;
      ComposeStore.emitChange();
    }
  })
});

module.exports = ComposeStore;
