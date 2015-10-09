var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
  google: {
    email: String,
    refreshToken: String
  }
});

module.exports = mongoose.model('User', userSchema)
