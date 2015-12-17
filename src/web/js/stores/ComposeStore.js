'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var _inReplyTo = {};
var _invite = false;

var ComposeStore = assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit('CHANGE');
  },

  emitReset: function() {
    this.emit('RESET');
  },

  /**
   * @param {function} callback
   */
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

  getInvite: function() {
    return _invite;
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'SET_IN_REPLY_TO') {
      _inReplyTo = action.message;
      _invite = false;
      ComposeStore.emitChange();
    } else if (action.type === 'SET_INVITE') {
      _inReplyTo = {};
      _invite = action.message;
      ComposeStore.emitChange();
    } else if (action.type === 'RESET_FIELDS') {
      ComposeStore.emitReset();
    }
  })
});

module.exports = ComposeStore;