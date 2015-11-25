'use strict';
var chai = require('chai');
var should = chai.should();
var mockery = require('mockery');
var sinon = require('sinon');
var request = require('supertest');

var kbpgp = require('kbpgp');

// For session mocking
var express = require('express');
var session = require('express-session');

// Stub out ensureAuthenticated middleware so we don't have to mess with the
// authentication stuff in sessions.
var auth = require('../src/auth.js');
sinon.stub(auth, "ensureAuthenticated", (req, res, next) => {
  return next();
});

// Stub out calls to mongoose.Model.save
var Invite = require('../src/models/invite.js');
let inviteSaveStub = sinon.stub(Invite.prototype, "save", (cb) => cb());

// Stub out database calls, generate fake return results if necessary.
var db = require('../src/db.js');
let storeInviteKeysStub = sinon.stub(db, "storeInviteKeys", (recipient, keys) => {
  return new Promise(function(resolve, reject) {
    resolve(new Invite({
      recipientEmail: recipient,
      expires: new Date(),
      pgp: {
        public_key: keys.publicKey,
        private_key: keys.privateKey
      }
    }));
  });
});

let mockInvite = new Invite({
  id: 'lol',
  recipientEmail: 'me@example.com',
  expires: new Date(),
  pgp: {
    public_key: 'public',
    private_key: 'private'
  }
});

let getInviteStub = sinon.stub(db, "getInvite", (id) => {
  return new Promise(function(resolve, reject) {
    resolve(mockInvite);
  });
});

// Stub out Gmail API calls.
var GmailClient = require('../src/gmailClient.js');
let sendMessageStub = sinon.stub(GmailClient.prototype, "sendMessage", (jsonMessage, threadId) =>
  new Promise((resolve, reject) => resolve())
);

// Set up an alternate version of the app with middleware that sets the
// temp passphrase and email in the session, in case they can't be set in
// the scope of the test.
let mockPassphrase = 'sooper%20secret';
let mockSenderEmail = 'test.runner@example.com';
var app = require('../src/app.js');
let testApp = express();
testApp.use(session({
  secret: 'ancient astronauts exist',
  resave: false,
  saveUninitialized: false
}));
testApp.all('*', function(req, res, next) {
  req.session.tempPassphrase = mockPassphrase;
  req.session.email = mockSenderEmail;
  next();
});
testApp.use(app);

describe('app.js', function() {
  describe('GET /invite/getKey', function() {
    it('Should provide an id and PGP public key with the correct user id', function(done) {
      this.timeout(5000);
      // Make request to /invite/getKey endpoint
      request(app)
        .get('/invite/getKey?recipient=me%40example%2Ecom')
        .expect(200)
        .end(function(err, res) {
          // Basic output validation
          if (err) {
            return done(err);
          }
          if (!res.body.inviteId) {
            return done(new Error('No invite id returned'));
          }
          if (!res.body.publicKey) {
            return done(new Error('No public key returned'));
          }

          // Ensure database call was made with correct data
          sinon.assert.calledWith(
            storeInviteKeysStub,
            'me@example.com',
            sinon.match({ publicKey: res.body.publicKey })
          );

          // Ensure that the userid contains the correct email address
          kbpgp.KeyManager.import_from_armored_pgp({
            armored: res.body.publicKey
          }, function(err, mgr) {
            mgr.pgp.userids[0].components.email.should.equal('me@example.com');
            done();
          });
        });
    });
  });

  describe('POST /invite/sendInvite', function(done) {
    it('Should update the invite db object and send an email', function(done) {
      let mockSubject = 'Test subject';
      let mockInviteId = '13F25';
      let mockBody = 'Patient 13F25 has responded extremely positively to the treatment.';

      request(testApp)
        .post('/invite/sendInvite')
        .send({
          inviteId: mockInviteId,
          emailBody: mockBody,
          subject: mockSubject
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          sinon.assert.calledWith(getInviteStub, mockInviteId);
          // No nice way to verify message was saved since its not a parameter
          sinon.assert.called(inviteSaveStub);
          sinon.assert.calledWith(sendMessageStub,
            {
              headers: {
                to: [mockInvite.recipientEmail],
                from: mockSenderEmail,
                subject: mockSubject,
                date: sinon.match.any
              },
              body: sinon.match((actualBody) => {
                return actualBody.includes(mockBody) && actualBody.includes(mockPassphrase);
              })
            }
          );
          done();
        });
    });
  });
  describe('GET /invite/viewInvite', function() {
    it('Should return the encrypted message and key associated with the id', function(done) {
      let mockId = 'lol';
      let mockPw = 'password1234';

      request(app)
        .get('/invite/viewInvite')
        .query({ id: mockId, pw: mockPw })
        .expect(200)
        .end(function(err, res) {
          if (err) { return done(err); }
          res.body.should.have.property('email');
          res.body.should.have.property('key');
          res.body.email.should.equal(mockInvite.message);
          res.body.key.should.equal(mockInvite.pgp.private_key);
          done();
        });
    });
  });
});
