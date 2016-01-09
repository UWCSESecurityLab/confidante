'use strict';

module.exports = {
  getMessageHeader: function(message, header) {
    if (!message || Object.keys(message).length === 0) {
      return '';
    }

    header = header.toLowerCase();
    var headers = message.payload.headers;
    for (var i=0; i<headers.length; i++) {
      var h = headers[i];
      if (h.name.toLowerCase() === header) {
        return h.value;
      }
    }
    return '';
  },

  getThreadHeader: function(thread, header) {
    if (!thread || Object.keys(thread).length === 0) {
      return '';
    }

    header = header.toLowerCase();
    var headers = thread.messages[0].payload.headers;
    for (var i=0; i<headers.length; i++) {
      var h = headers[i];
      if (h.name.toLowerCase() === header) {
        return h.value;
      }
    }
    return '';
  },

  getMessageBody: function(message) {
    if (message.payload.mimeType == 'multipart/alternative') {
      // For multipart messages, we need to find the plaintext part.
      var messagePart = message.payload.parts.find(function(messagePart) {
        return messagePart.mimeType == 'text/plain';
      });
      if (messagePart !== undefined) {
        return new Buffer(messagePart.body.data, 'base64').toString();
      }
    } else {
      return new Buffer(message.payload.body.data, 'base64').toString();
    }
    return '<<NO MESSAGE BODY>>';
  },

  /**
   * Return the list of names or email addresses of people who have participated
   * in an email thread.
   * @param thread The thread to parse for participants.
   * @param me (optional) The email address of the current user. If it appears
   * in the from field of a message, it's converted to the string "me".
   */
  getPeopleInThread: function(thread, me) {
    let participants = '';
    let count = 0;

    thread.messages.forEach(function(message) {
      let headers = message.payload.headers;
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].name == 'To') {
          if (participants.length > 0) {
            participants += ', ';
          }
          if (headers[i].value.includes(me)) {
            participants += 'me';
          } else {
            participants += headers[i].value.split(' <')[0];
          }
          count++;
        }
      }
    });
    if (count > 1) {
      participants += ' (' + count + ')';
    }
    return participants;
  }
};
