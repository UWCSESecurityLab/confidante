var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  keybase: {
    id: String
  },
  google: {
    email: String,
    refreshToken: String
  }
});

module.exports = mongoose.model('User', userSchema);
