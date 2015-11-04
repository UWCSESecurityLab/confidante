'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher'); 
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var _inReplyTo = {};

var InReplyToStore = assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit('CHANGE');
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

  get: function() {
    return _inReplyTo;
  },

  dispatchToken: InboxDispatcher.register(function(action) {
    if (action.type === 'SET_IN_REPLY_TO') {
      _inReplyTo = action.message;
      InReplyToStore.emitChange();
    } else {
      // Do nothing on all other action types.
    }
  })
});

module.exports = InReplyToStore;
