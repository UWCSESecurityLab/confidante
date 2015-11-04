'use strict';

module.exports = {
  getMessageHeader: function(message, header) {
    var headers = message.payload.headers;
    for (var i=0; i<headers.length; i++) {
      var h = headers[i];
      if (h.name === header) {
        return h.value;
      }
    }
    return '<<NO MESSAGE HEADER ' + header + 'FOUND>>';

  },

  getThreadHeader: function(thread, header) {
    var headers = thread.messages[0].payload.headers;
    for (var i=0; i<headers.length; i++) {
      var h = headers[i];
      if (h.name === header) {
        return h.value;
      }
    }
    return '<<NO THREAD HEADER ' + header + 'FOUND>>';
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
