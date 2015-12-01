'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');

module.exports = {
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
  }
};
