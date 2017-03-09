'use strict';

var InboxDispatcher = require('../dispatcher/InboxDispatcher');

module.exports = {
  ///////////////////////////////
  //// Compose Store Actions ////
  ///////////////////////////////
  /**
   * Sets the 'To:' field in ComposeArea to the specified value.
   * @param message.message The JSON Gmail message containing metadata info
   * @param message.replyAll A boolean, true if message is a reply all
   */
  setInReplyTo: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_IN_REPLY_TO',
      messageInfo: message
    });
  },

  setComposeContents: function(message) {
    InboxDispatcher.dispatch({
      type: 'SET_COMPOSE_CONTENTS',
      message: message
    });
  },

  setComposeUIOpen: function() {
    InboxDispatcher.dispatch({
      type: 'SET_COMPOSE_ON'
    });
  },

  setComposeUIClose: function() {
    InboxDispatcher.dispatch({
      type: 'SET_COMPOSE_CLOSE'
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
   * Archive all selected messages.
   */
  archiveSelectedThreads: function() {
    InboxDispatcher.dispatch({ type: 'ARCHIVE_SELECTED_THREADS' });
  },

  ///////////////////////////////
  //// Message Store Actions ////
  ///////////////////////////////
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
   * Select a thread in the UI.
   * @param threadId The id of the Gmail thread.
   */
  setChecked: function(threadId, checked) {
    InboxDispatcher.dispatch({
      type: 'SET_CHECKED',
      message: {
        threadId: threadId,
        checked: checked
      }
    });
  },

  /**
   * Set whether a thread is expanded or not in the inbox UI.
   * @param threadId The id of the Gmail thread.
   */
  setExpandedThread: function(threadId, expanded) {
    InboxDispatcher.dispatch({
      type: 'SET_EXPANDED_THREAD',
      message: {
        threadId: threadId,
        expanded: expanded
      }
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
   * Change the Gmail mailbox that is being fetched from
   * @param mailbox The name of the mailbox.
   */
  changeMailbox: function(mailbox) {
    InboxDispatcher.dispatch({
      type: 'CHANGE_MAILBOX',
      mailbox: mailbox
    });
  },

  /**
   * Get the next page of email threads in the current mailbox.
   */
  fetchNextPage: function() {
    InboxDispatcher.dispatch({
      type: 'NEXT_PAGE'
    });
  },

  /**
   * Get the previous page of email threads in the current mailbox.
   */
  fetchPrevPage: function() {
    InboxDispatcher.dispatch({
      type: 'PREV_PAGE'
    });
  },

  ////////////////////////////////////
  //// Autocomplete Store Actions ////
  ////////////////////////////////////
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
  },

  /**
   * Force any partial email addresses in <ContactsAutocomplete> to be tokenized
   * for sending messages.
   * @param onSuccess The function that should be called once tokenization is done.
   * @param onError The function that should be called if tokenization failed.
   */
  forceTokenize: function(onSuccess, onError) {
    InboxDispatcher.dispatch({
      type: 'FORCE_TOKENIZE',
      onSuccess: onSuccess,
      onError: onError
    });
  }
};
