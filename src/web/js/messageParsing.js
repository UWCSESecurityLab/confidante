'use strict';

var addressParser = require('address-rfc2822');

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
    if (message.payload.mimeType.startsWith('multipart')) {
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
    let participants = [];

    thread.messages.forEach(function(message) {
      let headers = message.payload.headers;
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].name == 'From') {
          if (headers[i].value.includes(me)) {
            participants.push('me');
          } else {
            participants.push(headers[i].value.split(' <')[0]);
          }
        }
      }
    });

    if (participants.length > 2) {
      return participants[0] + ' ... ' + participants[participants.length - 1] +
          ' (' + participants.length + ')';
    } else {
      return participants.join(', ');
    }
  },

  getParticipantsInMessage: function(message) {
    let headers = message.payload.headers;
    let participants = [];
    for (let i = 0; i < headers.length; i++) {
      let header = headers[i];
      if (header.name === 'To' || header.name === 'From') {
        header.value.split(',').forEach((person) => {
          participants.push(person.trim());
        });
      }
    }
    return participants;
  },

  /**
   * Takes two email addresses in "Johnny Plaintext <johnny@pgp.org>" or
   * "johnny@pgp.org" form (RFC2282 form) and compares them.
   * @param address1 First address to compare.
   * @param address2 First address to compare.
   * @return True if they're the same email, false otherwise.
   */
  isSameAddress: function(address1, address2) {
    return addressParser.parse(address1)[0].address ===
           addressParser.parse(address2)[0].address;
  }
};
