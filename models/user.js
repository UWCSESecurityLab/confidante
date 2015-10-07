var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
  googleId: {
    type: String,
    index: {
      unique: true
    }
  },
  sessionID: {
    type: String
  },
  accessToken: String,
  refreshToken: String,
  email: String,
  profile: Object
});

module.exports = mongoose.model('User', userSchema)
