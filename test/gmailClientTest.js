'use strict'
const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const mockery = require('mockery');
const sinon = require('sinon');

const GmailClient = require('../src/gmailClient.js');
// var google = require('googleapis');
// var googleAuth = require('google-auth-library');
// var auth = new googleAuth();

// Test data
const nonPgpThread = require('./resources/nonPgpThread.json');
const pgpThread = require('./resources/pgpThread.json');
const pgpThreadNoParts = require('./resources/pgpThreadNoParts');
const threadList = require('./resources/threadList.json');

// var gmailStub = sinon.stub(google.gmail('v1'));
// var googleStub = sinon.stub(google, 'gmail', function() {
//   return gmailStub;
// });
// var threadGetStub = sinon.stub(gmailStub.users.threads, 'get');

var mockToken = 'test_access_token';

describe('GmailClient', function() {
  before(function() {
    mockery.enable();
  });

  beforeEach(function() {
    mockery.registerAllowable('../pgp.js');
    // mockery.registerMock('googleapis', googleStub);
  });

  afterEach(function() {
    mockery.deregisterAll();
  });

  // TODO: tests were commented out during migration to a server-less Gmail
  // client. These may be reimplemented at a later time, so leaving the old ones
  // in here.

  // describe('#getEmailAddress()', function() {
  //   it('should return a promise containing the user\'s email', function() {
  //     var testEmail = 'me@example.com';
  //     var getProfileStub = sinon.stub(gmailStub.users, 'getProfile');
  //     getProfileStub.callsArgWith(1, null, {
  //       'emailAddress': testEmail,
  //       'messagesTotal': 144,
  //       'threadsTotal': 20,
  //       'historyId': 2
  //     });
  //     var gmail = new GmailClient(mockToken);
  //     return gmail.getEmailAddress().should.eventually.equal(testEmail);
  //   });
  // });
  //
  // describe('#getThread()', function() {
  //   it('should return a promise containing the requested thread', function() {
  //     threadGetStub.callsArgWith(1, null, pgpThread);
  //     var gmail = new GmailClient(mockToken);
  //     return gmail.getThread('test_id').should.eventually.equal(pgpThread);
  //   });
  // });

  describe('#filterPGPThreads()', function() {
    it('should remove non PGP threads from an array of threads', function() {
      var mixedThreads = [nonPgpThread, pgpThread];
      var gmail = new GmailClient(mockToken);
      var result = gmail.filterPGPThreads(mixedThreads);
      result.length.should.equal(1);
      result[0].should.equal(mixedThreads[1]);
    });
    it('should be able to process threads with non multipart bodies', function() {
      var gmail = new GmailClient(mockToken);
      var result = gmail.filterPGPThreads([pgpThreadNoParts]);
      result.length.should.equal(1);
      result[0].should.equal(pgpThreadNoParts);
    });
  });

  describe('#buildRfcMessage()', function() {
    it('should build an RFC 5322 compliant message from JSON', function() {
      let headers = {
        from: 'me@example.com',
        to: 'you@example.com, abc@abc.xyz',
        cc: ['cc@cc.tv'],
        bcc: ['bcc@asdf.com'],
        subject: 'Test subject',
        date: 'Mon Oct 19 2015 13:37:30 GMT-0700 (PDT)'
      };
      let body = 'Test body'
      var expectedOutput = 'From: me@example.com\r\n'+
          'To: you@example.com, abc@abc.xyz\r\n' +
          'Cc: cc@cc.tv\r\n' +
          'Bcc: bcc@asdf.com\r\n' +
          'Subject: Test subject\r\n' +
          'Date: Mon Oct 19 2015 13:37:30 GMT-0700 (PDT)\r\n' +
          '\r\n' +
          'Test body';
      var gmailClient = new GmailClient(mockToken);
      gmailClient.buildRfcMessage(headers, body).should.equal(expectedOutput);
    });
  });

  // describe('#getEncryptedMail()', function() {
  //   it('should fetch a list of threads from a Gmail Inbox, and return only the PGP encrypted ones', function() {
  //     threadGetStub.withArgs({
  //        auth: sinon.match.any,
  //        id: '15068ad2c26a82a7',
  //        userId: 'me'
  //     }).callsArgWith(1, null, pgpThread);
  //
  //     threadGetStub.withArgs({
  //       auth: sinon.match.any,
  //       id: '15068af0e40309ce',
  //       userId: 'me'
  //     }).callsArgWith(1, null, nonPgpThread);
  //
  //     var threadListStub = sinon.stub(gmailStub.users.threads, 'list');
  //     threadListStub.callsArgWith(1, null, threadList);
  //
  //     var gmail = new GmailClient(mockToken);
  //     var inboxPromise = gmail.getEncryptedMail('INBOX');
  //     return Promise.all([
  //       inboxPromise.should.eventually.have.deep.property('threads[0]', pgpThread),
  //       inboxPromise.should.eventually.not.have.deep.property('threads[0]', nonPgpThread)
  //     ]);
  //   });
  // });
});
