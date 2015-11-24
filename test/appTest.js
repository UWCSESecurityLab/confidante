'use strict';
var chai = require('chai');
var should = chai.should();
var mockery = require('mockery');
var sinon = require('sinon');
var request = require('supertest');

var kbpgp = require('kbpgp');

// Mock out ensureAuthenticated middleware so we don't have to mess with the
// session store.
var auth = require('../src/auth.js');
var mockAuth = sinon.stub(auth, "ensureAuthenticated", (req, res, next) => {
  return next();
});

describe('app.js', function() {
  describe('/invite/getKey', function() {
    it('Should provide an id and PGP public key with the correct user id', function(done) {
      this.timeout(5000);
      var app = require('../src/app.js');
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
});
