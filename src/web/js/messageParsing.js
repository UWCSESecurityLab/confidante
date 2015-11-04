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
    // return '<<NO MESSAGE HEADER ' + header + 'FOUND>>';
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
    // return '<<NO THREAD HEADER ' + header + 'FOUND>>';
    return '';
  },

  getMessageBody: function(message) {
    if (message.payload.mimeType == 'text/plain') {
      return new Buffer(message.payload.body.data, 'base64').toString();
    } else if (message.payload.mimeType = 'multipart/alternative') {
      // For multipart messages, we need to find the plaintext part.
      var messagePart = message.payload.parts.find(function(messagePart) {
        return messagePart.mimeType == 'text/plain';
      });
      if (messagePart !== undefined) {
        return new Buffer(messagePart.body.data, 'base64').toString();
      }
    }
    return '<<NO MESSAGE BODY>>';
  }
}
