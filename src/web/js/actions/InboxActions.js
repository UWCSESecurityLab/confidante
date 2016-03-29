'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');

module.exports = {
  /**
   * Sets the 'To:' field in ComposeArea to the specified value.
   * @param message.message The JSON Gmail message containing metadata info
   * @param message.replyAll A boolean, true if message is a reply all
   */
  setInReplyTo: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_IN_REPLY_TO',
      message: message
    });
  },

  /**
   * Toggles the ComposeArea between invites and regular emails.
   * @param message True if should show invite dialogue, false otherwise
   */
  setInvite: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_INVITE',
      message: message
    });
  },

  /**
   * Reset the external ComposeArea state (inReplyTo, invite, replyAll)
   */
  resetComposeFields: function() {
    InboxDispatcher.dispatch({ type: 'RESET_FIELDS' });
  },

  /**
   * Mark a thread as read.
   * @param threadId The id of the Gmail thread.
   */
  markAsRead: function(threadId) {
    InboxDispatcher.dispatch({
      type: 'MARK_AS_READ',
      message: threadId
    });
  },

  /**
   * Fetch new emails from Gmail.
   */
  refresh: function() {
    InboxDispatcher.dispatch({
      type: 'REFRESH'
    });
  },

  /**
   * Search for Google contacts matching the query.
   * @param query A string containing the search query.
   */
  getContacts: function(query) {
    InboxDispatcher.dispatch({
      type: 'GET_CONTACTS',
      query: query
    });
  },

  /**
   * Search for Keybase users matching the query.
   * @param query A string containing the serach query.
   */
  getKeybase: function(query) {
    InboxDispatcher.dispatch({
      type: 'GET_KEYBASE',
      query: query
    });
  },

  /**
   * Remove all autocomplete results.
   */
  clearAutocompletions: function() {
    InboxDispatcher.dispatch({
      type: 'CLEAR_AUTOCOMPLETIONS'
    });
  }
};
