var should = require('chai').should();
var pgp = require('../pgp.js');
var data = require('./pgpData.json');

describe('pgp.js', function() {
  describe('containsPGPMessage()', function() {
    it('should return true for PGP messages', function() {
      data.message.should.satisfy(pgp.containsPGPMessage);
    });
    it('should return false for non-PGP messages', function() {
      var message = 'such unencrypted very cleartext';
      message.should.not.satisfy(pgp.containsPGPMessage);
    });
  });
  describe('parsePGPType()', function() {
    it('should correctly identify PGP messages', function() {
      pgp.parsePGPType(data.message).should.equal(pgp.ARMOR_TYPES.MESSAGE);
    });
    it('should correctly identify PGP signatures', function() {
      pgp.parsePGPType(data.signature).should.equal(pgp.ARMOR_TYPES.SIGNATURE);
    });
    it('should correctly identify PGP public keys', function() {
      pgp.parsePGPType(data.public_key).should.equal(pgp.ARMOR_TYPES.PUBLIC_KEY_BLOCK);
    });
  });
});
