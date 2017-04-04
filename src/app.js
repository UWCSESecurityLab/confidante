'use strict';
const express = require('express');
const fs = require('fs');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('request');
const Cookie = require('cookie');
const URLSafeBase64 = require('urlsafe-base64');

const mongoose = require('mongoose');
const MongoSessionStore = require('connect-mongodb-session')(session);

const crypto = require('crypto');
const p3skb = require('./p3skb');
const pgp = require('./pgp.js');

const auth = require('./auth.js');
const db = require('./db.js');
const flags = require('./flags.js');
const GoogleOAuth = require('./googleOAuth.js');
const GmailClient = require('./gmailClient.js');

const version = require('../package.json').version;

// Mongo session store setup.
var store = new MongoSessionStore({
  uri: 'mongodb://localhost:27017/test',
  collection: 'mySessions'
});
store.on('error', function(error) {
  console.error('MongoDB error: ' + error);
});

// User store setup.
mongoose.connect('mongodb://localhost/test');
mongoose.connection.on('error', function(error) {
  console.error('MongoDB error: ' + error);
});

// Configure Express
var app = express();

app.set('views', __dirname + '/web/views');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: store
}));

app.use(express.static('gen'));
app.use('/fonts', express.static(__dirname + '/web/fonts/3rdparty'));
app.use(express.static(__dirname + '/web/js'));
app.use(express.static(__dirname + '/web/html'));
app.use(express.static(__dirname + '/web/css'));
app.use(express.static(__dirname + '/web/img'));
app.use('/releases', express.static('../releases'));

let KEYBASE_URL;
if (flags.KEYBASE_STAGING) {
  KEYBASE_URL = 'https://stage0.keybase.io';
} else {
  KEYBASE_URL = 'https://keybase.io';
}

let HOSTNAME;
if (!flags.PRODUCTION) {
  HOSTNAME = 'http://localhost:3000';
} else if (flags.TOOLNAME === 'Keymail' || flags.TOOLNAME === 'Confidante') {
  HOSTNAME = 'https://keymail.cs.washington.edu';
} else if (flags.TOOLNAME === 'Mailsafe') {
  HOSTNAME = 'https://www.mailsafe.io';
}
app.get('/', function(req, res) {
  res.render('index', {
    toolname: flags.TOOLNAME,
    loggedIn: auth.isAuthenticated(req.session),
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: version
  });
});

app.get('/help', function(req, res) {
  res.render('help', {
    toolname: flags.TOOLNAME,
    loggedIn: auth.isAuthenticated(req.session),
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: version
  });
});

app.get('/login', function(req, res) {
  res.render('login', {
    toolname: flags.TOOLNAME,
    loggedIn: false,
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: version
  });
});

app.get('/mail', function(req, res) {
  res.render('mail', {
    toolname: flags.TOOLNAME,
    loggedIn: true,
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: version
  });
});

app.get('/signup', function(req, res) {
  res.render('signup', {
    toolname: flags.TOOLNAME,
    loggedIn: false,
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: flags.VERSION
  });
});

/**
 * Part 1 of 2 in sending an invite to a non-Keymail user.
 * The inviter calls this endpoint to get a temporary public key for the
 * invitee. They should encrypt the invite message on their end, and then
 * call /invite/sendInvite.
 *
 * The request query should contain 'recipient=<invitee's email address>'.
 * The response body contains a JSON object containing the invite id,
 * and the public key. When calling /invite/sendInvite, pass back the invite id.
 */
app.get('/invite/getKey', auth.dataEndpoint, function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }

  let recipient = req.query.recipient;
  if (!recipient) {
    res.status(500).send('No recipient provided');
    return;
  }

  // Get a random code to encrypt the temporary private key
  let passphrase = URLSafeBase64.encode(crypto.randomBytes(64));
  // Store in the session, until /invite/sendInvite is sent
  req.session.tempPassphrase = passphrase;

  // Given an object containing a key pair, replace the private key with
  // a p3skb-encrypted string
  let encryptPrivateKey = function(keys) {
    return new Promise((resolve, reject) => {
      p3skb.armoredPrivateKeyToP3skb(keys.privateKey, passphrase)
        .then(encryptedKey => {
          resolve({publicKey: keys.publicKey, privateKey: encryptedKey});
        }).catch(err => reject(err));
    });
  };

  pgp.generateArmoredKeyPair(recipient)
    .then(encryptPrivateKey)
    .then(keys => db.storeInviteKeys(recipient, keys))
    .then(record => {
      res.json({ inviteId: record._id, publicKey: record.pgp.public_key });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send(err);
    });
});

/**
 * Sends an invite to a non-Keymail user. The client should provide a JSON
 * object containing 'message', 'inviteId', and 'subject'.
 */
app.post('/invite/sendInvite', auth.dataEndpoint, function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }

  if (!req.session.tempPassphrase || !req.body.inviteId || !req.body.message || !req.body.subject) {
    res.status(400).send('Bad request');
    return;
  }

  // Save the encrypted message in the invite model.
  let addMessageToInvite = function(invite) {
    return new Promise(function(resolve, reject) {
      invite.message = req.body.message;
      invite.subject = req.body.subject;
      invite.sender = req.session.email;
      invite.sent = new Date();
      invite.save(function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(invite);
        }
      });
    });
  };

  // Add an invite link to the message and send it over gmail.
  let sendMessage = function(invite) {
    let inviteUrl = HOSTNAME + '/invite?' +
        'id=' + req.body.inviteId + '&' +
        'pw=' + req.session.tempPassphrase;
    let inviteEmail = '<p>' + req.session.email +
        ' wants to send you an encrypted email through ' + flags.TOOLNAME +'! ' +
        'View the email at this link:</p>' +
        '<p><a href="' + inviteUrl + '">' + inviteUrl + '<a></p>\n\n' +
        '<pre>' + req.body.message + '</pre>';

    let gmailClient = new GmailClient(req.session.googleToken);
    return gmailClient.sendMessage({
      headers: {
        to: [invite.recipient],
        from: req.session.email,
        subject: req.body.subject,
        date: new Date().toString(),
        contentType: 'text/html; charset=utf-8'
      },
      body: inviteEmail
    });
  };

  db.getInvite(req.body.inviteId)
    .then(addMessageToInvite)
    .then(sendMessage)
    .then(function() {
      delete req.session.tempPassphrase;
      res.status(200).send('OK');
    }).catch(function(err) {
      console.error(err);
      res.status(500).send(err);
    });
});

app.get('/invite/viewInvite', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }

  if (!req.query.id) {
    res.status(400).send('Bad Request');
    return;
  }

  // Look up invite
  db.getInvite(req.query.id).then(function(invite) {
    if (invite) {
      // Return page, invite, and encrypted message
      res.json({
        staging: flags.KEYBASE_STAGING,
        expires: invite.expires.toString(),
        key: invite.pgp.private_key,
        message: invite.message,
        sender: invite.sender,
        sent: invite.sent.toString(),
        subject: invite.subject
      });
    }
  }).catch(function(err) {
    console.error(err);
    res.status(500).send(err);
  });
});

app.get('/invite', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }

  if (!req.query.id || !req.query.pw) {
    res.status(404).send('Not Found');
    return;
  }

  res.render('invite', {
    toolname: flags.TOOLNAME,
    loggedIn: false,
    staging: flags.KEYBASE_STAGING,
    electron: false
  });
});

/**
 * Authenticates the user with Google. The user must have already been
 * authenticated with Keybase so we can identify them.
 */
app.get('/auth/google', function(req, res) {
  if (!req.session.keybaseId) {
    res.statusCode(403).send('No Keybase Username associated with this session');
    return;
  }
  auth.attemptGoogleReauthentication(req.session).then(function() {
    res.redirect('/mail');
  }).catch(function(err) {
    console.error(err);
    res.redirect(GoogleOAuth.getAuthUrl());
  });
});

/**
 * Exchanges an authorization code for tokens from Google, and updates the
 * session and user store.
 */
app.get('/auth/google/return', function(req, res) {
  res.render('auth/google/return');
});

/**
 * These endpoints replicate the functionality of the keybase /getsalt.json and
 * /login.json endpoints by echoing the browser's request through to keybase
 * and returning the results verbatim to the user -- the server acts as a
 * proxy.
 *
 * The goal here is that the browser can perform the full login flow (as though
 * it were CORS enabled) without revealing its secrets (the user passphrase) to
 * our server. The server still gains access to the account, since it can eavesdrop
 * the entire conversation, but it doesn't learn the user passphrase. This is
 * critical, since the passphrase protects the private key, which the server may
 * also later eavesdrop (in encrypted form) if it is stored in keybase.
 */
app.get('/keybase/getsalt.json', function(req, res) {
  // /keybase/getsalt.json
  // Inputs: email_or_username
  // Outputs: guest_id, status, login_session, pwh_version
  var GET_SALT_URL = KEYBASE_URL + '/_/api/1.0/getsalt.json';
  request({
    method: 'GET',
    url: GET_SALT_URL,
    qs: req.query
  }, function(error, response, body) {
    if (error) {
      console.error(error);
      res.status(500).send('Failed to contact keybase /getsalt.json endpoint.');
      return;
    }
    // Echo the response with the same status code.
    res.status(response.statusCode).send(body);
  });
});

app.post('/keybase/login.json', function(req, res) {
  // /keybase/login.json
  // Inputs: email_or_username, hmac_pwh, login_session
  // Outputs: status, session, me, csrf_token
  //
  var LOGIN_URL = KEYBASE_URL + '/_/api/1.0/login.json';
  request({
    method: 'POST',
    url: LOGIN_URL,
    qs: req.query
  }, function (error, response, body) {
    if (error) {
      res.status(500).send('Failed to contact keybase /login.json endpoint.');
      return;
    }
    var keybase = JSON.parse(body);

    // Early exit if the login failed
    if (keybase.status.code != 0) {
      console.log('login.json failed');
      console.log(body);
      res.status(response.statusCode).send(body);
      return;
    }

    // Save the user's id and Keybase cookies in their session.
    req.session.keybaseId = keybase.me.id;
    var parsedCookies = response.headers['set-cookie'].map(
      function(cookie) {
        return Cookie.parse(cookie);
      }
    );
    req.session.keybaseCookie = parsedCookies.find(function(cookie) {
      if (flags.KEYBASE_STAGING) {
        return cookie.s0_session !== undefined;
      } else {
        return cookie.session !== undefined;
      }
    });

    // Save the CSRF token in the user's session.
    req.session.keybaseCSRF = keybase.csrf_token;

    // Create a User record for this user if necessary.
    db.storeKeybaseCredentials(keybase).then(function() {
      let sessionCookieString = null;
      response.headers['set-cookie'].forEach((cookieString) => {
        let cookie = Cookie.parse(cookieString);
        if (cookie.session) {
          sessionCookieString = cookieString;
        }
      });

      // Echo the response with the same status code on success.
      // Attach the Keybase cookie as a custom header.
      res.header('X-Keybase-Cookie', sessionCookieString)
         .status(response.statusCode)
         .send(body);
    }).catch(function(mongoError) {
      console.error(mongoError);
      req.session.destroy(function(sessionError) {
        console.error(sessionError);
        if (sessionError) {
          res.status(500).send(sessionError + mongoError);
        } else {
          res.status(500).send(mongoError);
        }
      });
    });
  });
});

app.post('/keybase/signup.json', function(req, res) {
  if (auth.isAuthenticated(req.session)) {
    res.status(400).send('Already logged in!');
    return;
  }
  request({
    method: 'POST',
    url: KEYBASE_URL + '/_/api/1.0/signup.json',
    qs: req.query
  }, function(error, response, body) {
    if (error) {
      console.error(error);
      res.send(error);
    } else {
      res.send(body);
    }
  });
});

app.post('/keybase/key/add.json', function(req, res) {
  if (!auth.isAuthenticatedWithKeybase(req.session)) {
    console.log('POST /keybase/key/add.json failed: need Keybase authentication');
    res.status(401).send('Cannot add keys without logging into Keybase');
    return;
  }

  request({
    method: 'POST',
    url: KEYBASE_URL + '/_/api/1.0/key/add.json',
    qs: req.query,
    jar: getKeybaseCookieJar(req.session),
    headers: {
      'X-CSRF-Token': req.session.keybaseCSRF
    }
  }, function(error, response, body) {
    if (error) {
      console.error(error);
      res.send(error);
    } else {
      res.send(body);
    }
  });
});

app.get('/keybase/key/fetch.json', auth.dataEndpoint, function(req, res) {
  request({
    method: 'GET',
    url: KEYBASE_URL + '/_/api/1.0/key/fetch.json',
    qs: req.query,
    jar: getKeybaseCookieJar(req.session),
    headers: {
      'X-CSRF-Token': req.session.keybaseCSRF
    }
  }, function(error, response, body) {
    if (error) {
      console.error(error);
      res.send(error);
    } else {
      res.send(body);
    }
  });
});

app.get('/logout', function(req, res) {
  if (auth.isAuthenticatedWithKeybase(req.session)) {
    request({
      method: 'POST',
      url: KEYBASE_URL + '/_/api/1.0/session/killall.json',
      headers: { 'X-CSRF-Token': req.session.keybaseCSRF },
      jar: getKeybaseCookieJar(req.session)
    }, function(error, response, body) {
      if (!error) {
        console.log(body);
      } else {
        console.error('Failed to kill sessions: ' + error);
      }
    });
  }

  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.get('/log/console', auth.webEndpoint, auth.isEric, function(req, res) {
  fs.readFile('console.log', (err, data) => {
    res.send(data.toString().split('\n').join('<br/>'));
  });
});

app.get('/log/error', auth.webEndpoint, auth.isEric, function(req, res) {
  fs.readFile('error.log', (err, data) => {
    res.send(data.toString().split('\n').join('<br/>'));
  });
});

app.listen(3000);
console.log(flags.TOOLNAME + ' server listening on port 3000');

module.exports = app; // For testing

/**
 * Returns a request.jar that contains the user's Keybase cookie. For use with
 * authenticated Keybase API endpoints.
 * @param session The Keymail session belonging to the Keybase user.
 * @return request.jar containing the session cookie.
 */
function getKeybaseCookieJar(session) {
  let cookieJar = request.jar();
  let cookieString;
  if (flags.KEYBASE_STAGING) {
    cookieString = 's0_session=' + session.keybaseCookie.s0_session;
  } else {
    cookieString = 'session=' +  session.keybaseCookie.session;
  }
  cookieJar.setCookie(cookieString, KEYBASE_URL);
  return cookieJar;
}
