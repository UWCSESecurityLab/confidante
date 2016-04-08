'use strict';
var express = require('express');
var compression = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var request = require('request');
var Cookie = require('cookie');
var URLSafeBase64 = require('urlsafe-base64');

var mongoose = require('mongoose');
var MongoSessionStore = require('connect-mongodb-session')(session);

var crypto = require('crypto');
var p3skb = require('./p3skb');
var pgp = require('./pgp.js');

var auth = require('./auth.js');
var db = require('./db.js');
var flags = require('./flags.js');
var GoogleOAuth = require('./googleOAuth.js');
var GmailClient = require('./gmailClient.js');
var messageParsing = require('./web/js/messageParsing');
var uuid = require('node-uuid');

var TOOLNAME = 'TOOLNAME';

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

let KEYBASE_URL;
if (flags.KEYBASE_STAGING) {
  KEYBASE_URL = 'https://stage0.keybase.io';
} else {
  KEYBASE_URL = 'https://keybase.io';
}

app.get('/', function(req, res) {
  res.render('index', {
    email: req.session.email,
    loggedIn: auth.isAuthenticated(req.session),
    staging: flags.KEYBASE_STAGING
  });
});

app.get('/help', function(req, res) {
  res.render('help', {
    toolname: TOOLNAME,
    email: req.session.email,
    loggedIn: auth.isAuthenticated(req.session),
    staging: flags.KEYBASE_STAGING
  });
});

app.get('/login', function(req, res) {
  if (auth.isAuthenticated(req.session)) {
    res.redirect('/mail');
  } else {
    res.render('login', {
      email: req.session.email,
      loggedIn: false,
      staging: flags.KEYBASE_STAGING
    });
  }
});

app.get('/mail', auth.webEndpoint, function(req, res) {
  res.render('mail', {
    email: req.session.email,
    loggedIn: true,
    staging: flags.KEYBASE_STAGING
  });
});

app.get('/signup', function(req, res) {
  res.render('signup', { loggedIn: false, staging: flags.KEYBASE_STAGING });
});

app.get('/getMail', auth.dataEndpoint, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.getEncryptedMail(req.query.mailbox).then(function(threads) {
    res.json(threads);
  });
});

app.post('/sendMessage', auth.dataEndpoint, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  let parent = req.body.parentMessage;
  let parentId = messageParsing.getMessageHeader(parent, 'Message-ID');
  let parentReferences = messageParsing.getMessageHeader(parent, 'References');
  let ourReferences = [parentReferences, parentId].join(' ');

  let linkid = req.body.linkid || uuid.v4();

  // Prepend plaintext thread pointer.
  let host = flags.PRODUCTION ? 
             'https://keymail.cs.washington.edu' :
             'http://localhost:3000';
  let link = `${host}/mail#linkid:${linkid}`;
  let header = `View this message in your encrypted inbox: ${link}\n\n`;
  let email = header + req.body.email;

  gmailClient.sendMessage({
    headers: {
      to: [req.body.to],
      from: req.session.email,
      subject: req.body.subject,
      date: new Date().toString(),
      inReplyTo: parentId,
      references: ourReferences
    },
    body: email
  }, req.body.parentMessage.threadId).then(function() {
    res.status(200).send('OK');
  }).catch(function(error) {
    res.status(500).send(error);
  });
});

app.post('/markAsRead', auth.dataEndpoint, function(req, res) {
  if (!req.query.threadId) {
    res.status(400).send('Missing thread id');
  }
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.markAsRead(req.query.threadId).then(function() {
    res.status(200).send('OK');
  }).catch(function(err) {
    console.log(err);
    res.status(500).send(err);
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
  }

  pgp.generateArmoredKeyPair(recipient)
    .then(encryptPrivateKey)
    .then(keys => db.storeInviteKeys(recipient, keys))
    .then(record => {
      res.json({ inviteId: record._id, publicKey: record.pgp.public_key });
    })
    .catch(err => {
      console.log(err);
      res.status(500).send(err);
    });
});

/**
 * Sends an invite to a non-Keymail user. The client should provide a JSON
 * object containing 'message', 'inviteId', and 'subject'.
 */
app.post('/invite/sendInvite', auth.dataEndpoint, function(req, res) {
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
  }

  // Add an invite link to the message and send it over gmail.
  let sendMessage = function(invite) {
    let host = flags.PRODUCTION ?
               'https://keymail.cs.washington.edu' :
               'http://localhost:3000';
    let inviteUrl = host + '/invite?' +
        'id=' + req.body.inviteId + '&' +
        'pw=' + req.session.tempPassphrase;
    let inviteEmail = '<p>' + req.session.email +
        ' wants to send you an encrypted email through Keymail! ' +
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
  }

  db.getInvite(req.body.inviteId)
    .then(addMessageToInvite)
    .then(sendMessage)
    .then(function() {
      delete req.session.tempPassphrase;
      res.status(200).send('OK');
    }).catch(function(err) {
      console.log(err);
      res.status(500).send(err);
    });
});

app.get('/invite/viewInvite', function(req, res) {
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
    res.status(500).send(err);
  });
});

app.get('/invite', function(req, res) {
  if (!req.query.id || !req.query.pw) {
    res.status(404).send('Not Found');
    return;
  }

  res.render('invite', { loggedIn: false, staging: flags.KEYBASE_STAGING });
});

/**
 * Authenticates the user with Google. The user must have already been
 * authenticated with Keybase so we can identify them.
 */
app.get('/auth/google', function(req, res) {
  if (!req.session.keybaseId) {
    res.statusCode(403).send('No Keybase ID associated with this session');
    return;
  }
  auth.attemptGoogleReauthentication(req.session).then(function() {
    res.redirect('/mail');
  }).catch(function(err) {
    console.log(err);
    GoogleOAuth.redirectToGoogleOAuthUrl(req, res);
  });
});

/**
 * Exchanges an authorization code for tokens from Google, and updates the
 * session and user store.
 */
app.get('/auth/google/return', function(req, res) {
  var code = req.query.code;
  if (!code) {
    res.redirect('/login');
  }

  // Get tokens, then lookup email address.
  var tokenPromise = GoogleOAuth.getInitialTokens(code);
  var emailPromise = tokenPromise.then(function(token) {
    var gmailClient = new GmailClient(token);
    return gmailClient.getEmailAddress();
  });
  Promise.all([tokenPromise, emailPromise]).then(function(values) {
    var token = values[0];
    var email = values[1];

    // Store full token object in the session for GmailClient.
    req.session.googleToken = token;
    req.session.email = email;

    // If a refresh token was returned, we need to store it in the database.
    if (token.refresh_token) {
      db.storeGoogleCredentials(req.session.keybaseId, email, token.refresh_token)
        .then(function() {
          res.redirect('/mail');
        }).catch(function(error) {
          console.error(error);
          res.redirect('/login');
        });
    } else {
      res.redirect('/mail');
    }
  }).catch(function(error) {
    console.error(error);
    res.redirect('/login');
  });
});

app.get('/contacts.json', auth.dataEndpoint, function(req, res) {
  let gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.searchContacts(req.query.q).then(function(body) {
    res.json(body);
  }).catch(function(err) {
    res.send(err);
  });
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
      // Echo the response with the same status code on success.
      res.status(response.statusCode).send(body);
    }).catch(function(mongoError) {
      req.session.destroy(function(sessionError) {
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
      url: 'https://keybase.io/_/api/1.0/session/killall.json',
      headers: { 'X-CSRF-Token': req.session.keybaseCSRF },
      jar: getKeybaseCookieJar(req.session)
    }, function(error, response, body) {
      if (!error) {
        console.log(body);
      } else {
        console.log('Failed to kill sessions: ' + error);
      }
    });
  }

  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.listen(3000);
console.log('Keymail server listening on port 3000');

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
