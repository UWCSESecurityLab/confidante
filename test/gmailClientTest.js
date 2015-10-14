'use strict'
var chai = require('chai');
var should = chai.should();
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var mockery = require('mockery');
var sinon = require('sinon');

var GmailClient = require('../gmailClient.js');
var google = require('googleapis');

var gmailStub = sinon.stub(google.gmail('v1'));
var googleStub = sinon.stub(google, 'gmail', function() {
  return gmailStub;
});

var token = {
  "access_token": "test_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "test_refresh_token"
}

describe('GmailClient', function() {
  before(function() {
    mockery.enable();
  });

  beforeEach(function() {
    mockery.registerAllowable('../pgp.js');
    mockery.registerMock('googleapis', googleStub);
  });

  afterEach(function() {
    mockery.deregisterAll();
  });

  describe('#getEmailAddress()', function() {
    it('should return the email address from the Gmail API users.getProfile call', function() {
      var testEmail = 'me@example.com';
      var getProfileStub = sinon.stub(gmailStub.users, 'getProfile');
      getProfileStub.callsArgWith(1, null, {
        'emailAddress': testEmail,
        'messagesTotal': 144,
        'threadsTotal': 20,
        'historyId': 2
      });
      var gmail = new GmailClient(token);
      return gmail.getEmailAddress().should.eventually.equal(testEmail);
    });
  });
});
