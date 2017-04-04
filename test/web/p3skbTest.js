'use strict'
const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const p3skb = require('../src/web/js/p3skb.js');
const fs = require('fs');
var testkey = fs.readFileSync('test/resources/testkey', 'utf8');

describe('p3skb', function() {
  describe('#p3skbToArmoredPrivateKey', function() {
    it('should be the inverse of armoredPrivateKeyToP3skb', function(done) {
      this.timeout(5000);
      var passphrase = 'double plus good';

      var p3sbkToArmoredWithPassphrase = function(p3sbk) {
        return p3skb.p3skbToArmoredPrivateKey(p3sbk, passphrase);
      }

      var recoveredTestkey = p3skb.armoredPrivateKeyToP3skb(testkey, passphrase)
                                   .then(p3sbkToArmoredWithPassphrase)
      recoveredTestkey.should.eventually.equal(testkey).and.notify(done);

    });
  });
});
