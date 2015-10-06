var mongoose = require('mongoose');
var Schema = mongoose.Schema

var userSchema = new Schema({
  // TODO: figure out Google user fields
  googleToken: Object
});

module.exports = mongoose.model('User', userSchema)
