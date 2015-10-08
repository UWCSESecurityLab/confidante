var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
  google: {
    email: String,
    token: Object
  }
});

module.exports = mongoose.model('User', userSchema)
