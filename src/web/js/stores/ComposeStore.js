'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var _replyAll;
var _inReplyTo = {};
var _invite = false;
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
      _inReplyTo = action.message.message;
      _invite = false;
      _subject = '';
      _email = '';
      _signPrivate = true;
      _displayCompose = true;
      ComposeStore.emitChange();
    } else if (action.type === 'SET_INVITE') {
      _inReplyTo = {};
      _invite = action.message;
      _subject = '';
      _email = '';
      _signPrivate = true;
      _displayCompose = true;
      ComposeStore.emitChange();
    } else if (action.type === 'RESET_FIELDS') {
      _inReplyTo = {};
      _replyAll = false;
      _invite = false;
      _subject = '';
      _email = '';
      _signPrivate = true;
      _displayCompose = true;
      ComposeStore.emitReset();
    } else if(action.type === 'SET_EMAIL') {
      _replyAll = action.message.replyAll;
      _inReplyTo = action.message.message;
      _invite = false;
      _subject = action.message.subject;
      _email = action.message.email;
      //_signPrivate = action.message;
      _displayCompose = true;
      ComposeStore.emitChange();
    } else if(action.type === 'SET_COMPOSE_ON') {
      console.log(action.message);
      _replyAll = action.message.replyAll;
      _inReplyTo = action.message.message;
      _invite = false;
      _subject = action.message.subject;
      _email = action.message.email;
      _signPrivate = true;
      _displayCompose = true;
      ComposeStore.emitChange();
    } else if(action.type === 'SET_COMPOSE_OFF') {
      console.log(action.message);
      _replyAll = action.message.replyAll;
      _inReplyTo = action.message.message;
      _invite = false;
      _subject = action.message.subject;
      _email = action.message.email;
      _signPrivate = true;
      _displayCompose = true;
      ComposeStore.emitChange();
    }
  })
});

module.exports = ComposeStore;
