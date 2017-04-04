'use strict';
const chai = require('chai');
const should = chai.should();
const mockery = require('mockery');
const sinon = require('sinon');
const request = require('supertest');

const kbpgp = require('kbpgp');
const p3skb = require('../src/p3skb');
const url = require('url');
const querystring = require('querystring');

// For session mocking
const express = require('express');
const session = require('express-session');

// Stub out authentication middleware so we don't have to mess with the
// authentication stuff in sessions.
const auth = require('../src/auth.js');
sinon.stub(auth, "webEndpoint", (req, res, next) => {
  return next();
});

sinon.stub(auth, "dataEndpoint", (req, res, next) => {
  return next();
});

// Stub out calls to mongoose.Model.save
const Invite = require('../src/models/invite.js');
let inviteSaveStub = sinon.stub(Invite.prototype, "save", (cb) => cb());

// Stub out database calls, generate fake return results if necessary.
const db = require('../src/db.js');
let mockInvite = {}
let storeInviteKeysStub = sinon.stub(db, "storeInviteKeys", (recipient, keys) => {
  return new Promise(function(resolve, reject) {
    mockInvite = new Invite({
      recipient: recipient,
      expires: new Date(),
      pgp: {
        public_key: keys.publicKey,
        private_key: keys.privateKey
      }
    });
    resolve(mockInvite);
  });
});

let getInviteStub = sinon.stub(db, "getInvite", (id) => {
  return new Promise(function(resolve, reject) {
    resolve(mockInvite);
  });
});

// Stub out Gmail API calls.
const GmailClient = require('../src/gmailClient.js');
let sentMessage = {}
let sendMessageStub = sinon.stub(GmailClient.prototype, "sendMessage", (jsonMessage, threadId) =>
  new Promise((resolve, reject) => {
    sentMessage = jsonMessage;
    resolve();
  })
);

// Set up an alternate version of the app with middleware that sets the
// temp passphrase and email in the session, in case they can't be set in
// the scope of the test.
let mockPassphrase = 'sooper%20secret';
let mockSenderEmail = 'test.runner@example.com';
const app = require('../src/app.js');
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
          res.body.should.have.property('inviteId');
          res.body.should.have.property('publicKey');

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
          message: mockBody,
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
                to: [mockInvite.recipient],
                from: mockSenderEmail,
                subject: mockSubject,
                date: sinon.match.any,
                contentType: sinon.match.any
              },
              body: sinon.match((actualBody) => {
                return actualBody.includes(mockBody) &&
                    actualBody.includes(mockPassphrase) &&
                    actualBody.includes(mockInviteId);
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
          res.body.should.have.property('message');
          res.body.should.have.property('key');
          res.body.message.should.equal(mockInvite.message);
          res.body.key.should.equal(mockInvite.pgp.private_key);
          done();
        });
    });
  });

  describe('End-to-end invite test', function() {
    it('Can generate keys, send encrypted invite, decrypt private key, and decrypt invite', function(done) {
      this.timeout(8000);

      let testSubject = "Does this even work?";
      let testMessage = "If this message survives the whole journey I'll eat a shoe";

      let getKey = function() {
        return new Promise(function(resolve, reject) {
          request(app)
            .get('/invite/getKey?recipient=me%40example%2Ecom')
            .expect(200)
            .end(function(err, res) {
              if (err) { done(err); }
              resolve(res);
            });
        });
      };

      let encryptMessage = function(res) {
        return new Promise(function(resolve, reject) {
          kbpgp.KeyManager.import_from_armored_pgp({
            armored: res.body.publicKey
          }, function(err, invitee) {
            if (err) {
              done(err);
            }
            kbpgp.box({
              msg: testMessage,
              encrypt_for: invitee
            }, function(err, armored, buf) {
              if (err) {
                done(err);
              }
              resolve({ msg: armored, res: res });
            });
          });
        });
      };

      let sendInvite = function(params) {
        let cookie = params.res.headers['set-cookie'];
        let inviteId = params.res.body.inviteId;
        let msg = params.msg;
        return new Promise(function(resolve, reject) {
          request(app)
            .post('/invite/sendInvite')
            .set('Cookie', cookie)
            .send({
              message: msg,
              inviteId: inviteId,
              subject: testSubject
            })
            .expect(200)
            .end(function(err, res) {
              if (err) { return done(err); }
              resolve(inviteId);
            });
        });
      };

      let parsePassphrase = function(message) {
        let href = message.body.match('href=".*"')[0];
        let link = href.slice(href.indexOf('"') + 1, href.lastIndexOf('"'));
        let query = querystring.parse(url.parse(link).query);
        return query.pw;
      }

      let viewInvite = function(id) {
        return new Promise(function(resolve, reject) {
          request(app)
            .get('/invite/viewInvite')
            .query({ id: id })
            .expect(200)
            .end(function(err, res) {
              if (err) { return done(err); }
              resolve(res.body);
            });
        });
      };

      let decryptKey = function(invite) {
        return p3skb.p3skbToArmoredPrivateKey(invite.key, parsePassphrase(sentMessage));
      };

      let decryptMessage = function(invite, key) {
        return new Promise(function(resolve, reject) {
          let ring = new kbpgp.keyring.KeyRing();
          kbpgp.KeyManager.import_from_armored_pgp({
            armored: key
          }, function(err, manager) {
            if (err) {
              done(err);
            }
            ring.add_key_manager(manager);
            kbpgp.unbox({
              keyfetch: ring,
              armored: invite.message
            }, function(err, literals) {
              if (err) {
                done(err);
              }
              resolve(literals[0].toString());
            });
          });
        });
      };

      getKey()
        .then(encryptMessage)
        .then(sendInvite)
        .then(viewInvite)
        .then(function(invite) {
          return decryptKey(invite).then(function(key) {
            return decryptMessage(invite, key);
          });
        }).then(function(plaintext) {
          plaintext.should.equal(testMessage);
          done();
        }).catch(function(err) {
          done(err);
        });
    });
  });
});
