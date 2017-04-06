'use strict'
const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const messageParsing = require('../src/web/js/messageParsing.js');
const fs = require('fs');

describe('messageParsing', function() {
  describe('#messageParsingIsSameAddress', function() {
    it('should detect identical addresses', function() {
      messageParsing.isSameAddress('johnny@pgp.org', 
                                   'johnny@pgp.org').should.be.true;
      messageParsing.isSameAddress('Johnny Plaintext <johnny@pgp.org>', 
                                   'johnny@pgp.org').should.be.true;
      messageParsing.isSameAddress('Janie Plaintext <janie@pgp.org>', 
                                   'johnny@pgp.org').should.be.false;
      messageParsing.isSameAddress('Janie Plaintext <janie@pgp.org>', 
                                   'Janie Plaintext <johnny@pgp.org>').should.be.false;
    });
  });
});
