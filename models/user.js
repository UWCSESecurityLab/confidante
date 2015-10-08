var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
  google: {
    email: String,
    credentials: {
      access_token: String,
      token_type: String,
      id_token: String,
      expiry_date: Number
    }
  }
});

module.exports = mongoose.model('User', userSchema)
