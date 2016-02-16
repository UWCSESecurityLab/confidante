'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');

module.exports = {
  // ComposeStore actions
  setInReplyTo: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_IN_REPLY_TO',
      message: message
    });
  },
  setInvite: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_INVITE',
      message: message
    });
  },
  resetComposeFields: function() {
    InboxDispatcher.dispatch({ type: 'RESET_FIELDS' });
  },

  // MessageStore actions
  markAsRead: function(threadId) {
    InboxDispatcher.dispatch({
      type: 'MARK_AS_READ',
      message: threadId
    });
  },
  refresh: function() {
    InboxDispatcher.dispatch({
      type: 'REFRESH'
    });
  }
};
