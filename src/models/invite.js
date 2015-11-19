var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var inviteSchema = new Schema({
  id: String,
  recipientEmail: String,
  expires: Date,
  message: String,
  pgp: {
    public_key: String,
    private_key: String
  }
});

module.exports = mongoose.model('Invite', inviteSchema);
