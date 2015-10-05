(function() {
  var mongoose;
  mongoose = require('mongoose');
  exports.User = mongoose.model('User', {
    accessToken: String,
    refreshToken: String,
    sessionID: {
      type: String
    },
    email: String,
    googleId: {
      type: String,
      index: {
        unique: true
      }
    },
    profile: Object
  });
}).call(this);
