var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
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

module.exports = mongoose.model('User', userSchema)
