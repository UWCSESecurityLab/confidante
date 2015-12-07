var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var inviteSchema = new Schema({
  expires: Date,
  message: String,
  pgp: {
    public_key: String,
    private_key: String
  },
  recipient: String,
  sender: String,
  sent: Date,
  subject: String
});

module.exports = mongoose.model('Invite', inviteSchema);
