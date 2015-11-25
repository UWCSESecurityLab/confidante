'use strict';
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var request = require('request');
var Cookie = require('cookie');

var mongoose = require('mongoose');
var MongoSessionStore = require('connect-mongodb-session')(session);
var googleAuthLibrary = require('google-auth-library');

var crypto = require('crypto');
var p3skb = require('./p3skb');
var pgp = require('./pgp.js');

var auth = require('./auth.js');
var credentials = require('../client_secret.json');
var db = require('./db.js');
var GmailClient = require('./gmailClient.js');
var Invite = require('./models/invite.js');
var messageParsing = require('./web/js/messageParsing');
var User = require('./models/user.js');

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

app.get('/', function(req, res) {
  res.render('index', {
    email: req.session.email,
    loggedIn: auth.isAuthenticated(req.session)
  });
});

app.get('/login', function(req, res) {
  if (auth.isAuthenticated(req.session)) {
    res.redirect('/mail');
  } else {
    res.render('login', { email: req.session.email, loggedIn: false });
  }
});

app.get('/mail', auth.ensureAuthenticated, function(req, res) {
  res.render('mail', { email: req.session.email, loggedIn: true });
});

app.get('/inbox', auth.ensureAuthenticated, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.getEncryptedInbox().then(function(threads) {
    res.json(threads);
  });
});

app.post('/sendMessage', auth.ensureAuthenticated, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  let parent = req.body.parentMessage;
  let parentId = messageParsing.getMessageHeader(parent, 'Message-ID');
  let parentReferences = messageParsing.getMessageHeader(parent, 'References');
  let ourReferences = [parentReferences, parentId].join(' ');

  gmailClient.sendMessage({
    headers: {
      to: [req.body.to],
      from: req.session.email,
      subject: req.body.subject,
      date: new Date().toString(),
      inReplyTo: parentId,
      references: ourReferences
    },
    body: req.body.email
  }, req.body.parentMessage.threadId).then(function() {
    res.status(200).send('OK');
  }).catch(function(error) {
    res.status(500).send(error);
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
app.get('/invite/getKey', auth.ensureAuthenticated, function(req, res) {
  let recipient = req.query.recipient;
  if (!recipient) {
    res.status(500).send('No recipient provided');
    return;
  }

  // Get a random code to encrypt the temporary private key
  let passphrase = crypto.randomBytes(64).toString('base64');
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

  pgp.generateKeyPair(recipient)
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
app.post('/invite/sendInvite', auth.ensureAuthenticated, function(req, res) {
  if (!req.session.tempPassphrase || !req.body.inviteId || !req.body.message || !req.body.subject) {
    res.status(400).send('Bad request');
    return;
  }

  // Save the encrypted message in the invite model.
  let addMessageToInvite = function(invite) {
    return new Promise(function(resolve, reject) {
      invite.message = req.body.message;
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
    let inviteUrl = req.protocol + '://' + req.get('host') +
        '/invite/viewInvite?' +
        'id=' + req.body.inviteId + '&' +
        'pw=' + req.session.tempPassphrase;
    let inviteEmail = req.session.email +
        ' wants to send you an encrypted email through Keymail!\n' +
        'View the email at this link: ' +
        '<a href=' + inviteUrl + '>' + inviteUrl + '<a>\n\n' +
        req.body.message;

    let gmailClient = new GmailClient(req.session.googleToken);
    return gmailClient.sendMessage({
      headers: {
        to: [invite.recipientEmail],
        from: req.session.email,
        subject: req.body.subject,
        date: new Date().toString(),
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
  if (!req.query.id || !req.query.pw) {
    res.status(400).send('Bad Request');
    return;
  }

  // Look up invite
  db.getInvite(req.query.id).then(function(invite) {
    if (invite) {
      // Return page, invite, and encrypted message
      res.json({
        message: invite.message,
        key: invite.pgp.private_key
      });
    }
  }).catch(function(err) {
    res.status(500).send(err);
  });
});

/**
 * Authenticates the user with Google. The user must have already been
 * authenticated with Keybase so we can identify them.
 */
app.get('/auth/google', function(req, res) {
  db.getUser(req.session.keybaseId).then(function(user) {
    if (!user) {
      // If there is no Keybase id, send them back to the initial login.
      res.redirect('/login');
    }
    if (user.google.refreshToken) {
      // If the user has logged in with Google before, get an access token
      // using the refresh token.
      refreshGoogleOAuthToken(user.google.refreshToken).then(function(token) {
        req.session.googleToken = token;
        req.session.email = user.google.email;
        res.redirect('/mail');
      }).catch(function() {
        redirectToGoogleOAuthUrl(req, res);
      });
    } else {
      redirectToGoogleOAuthUrl(req, res);
    }
  }).catch(function(err) {
    res.statusCode(500).send(err);
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
  var tokenPromise = getInitialGoogleOAuthTokens(code);
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
      db.storeGoogleCredentials(req.session.keybaseId, email,token.refresh_token)
        .then(function() {
          res.redirect('/');
        }).catch(function(error) {
          console.error(error);
          res.redirect('/login');
        });
    } else {
      res.redirect('/');
    }
  }).catch(function(error) {
    console.error(error);
    res.redirect('/login');
  });
});

app.get('/contacts.json', auth.ensureAuthenticated, function(req, res) {
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
app.get('/getsalt.json', function(req, res) {
  // /getsalt.json
  // Inputs: email_or_username
  // Outputs: guest_id, status, csrf_token, login_session, pwh_version
  //
  var GET_SALT_URL = 'https://keybase.io/_/api/1.0/getsalt.json';
  request(
    { method: 'GET',
      url: GET_SALT_URL,
      qs: req.query
    },
    function(error, response, body) {
      if (error) {
        res.status(500).send('Failed to contact keybase /getsalt.json endpoint.');
        return;
      }
      // Echo the response with the same status code.
      res.status(response.statusCode).send(body);
    });
});

app.post('/login.json', function(req, res) {
  // /login.json
  // Inputs: email_or_username, hmac_pwh, login_session
  // Outputs: status, session, me
  //
  var LOGIN_URL = 'https://keybase.io/_/api/1.0/login.json';
  request(
    {
      method: 'POST',
      url: LOGIN_URL,
      qs: req.query
    },
    function (error, response, body) {
      if (error) {
        res.status(500).send('Failed to contact keybase /login.json endpoint.');
        return;
      }
      var keybase = JSON.parse(body);

      // Early exit if the login failed
      if (keybase.status.code != 0) {
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
        return cookie.session !== undefined;
      });
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
    }
  );
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.listen(3000);

module.exports = app; // For testing

function redirectToGoogleOAuthUrl(req, res) {
  // Otherwise, we need to send them through the Google OAuth flow.
  var oauth2Client = buildGoogleOAuthClient();
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'email',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    redirect_uri: credentials.web.redirect_uris[0]
  });
  res.redirect(authUrl);
}

/**
 * Constructs a Google OAuth client with the app's credentials.
 */
function buildGoogleOAuthClient() {
  var googleAuth = new googleAuthLibrary();
  return new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );
}

/**
 * Requests an access token and refresh token (if applicable) from Google.
 * @param authCode the authorization code sent in the OAuth callback
 * @return Promise containing the access token/refresh token object
 */
function getInitialGoogleOAuthTokens(authCode) {
  return new Promise(function(resolve, reject) {
    var oauth2Client = buildGoogleOAuthClient();
    oauth2Client.getToken(authCode, function(err, token) {
      if (err) {
        reject(Error('Error while tring to retrieve access token' + err));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Get the access token given a refresh token.
 * @param refreshToken The user's refresh token.
 * @return Promise containing the access token.
 */
function refreshGoogleOAuthToken(refreshToken) {
  return new Promise(function(resolve, reject) {
    var oauth2Client = buildGoogleOAuthClient();
    oauth2Client.credentials.refresh_token = refreshToken;
    oauth2Client.getAccessToken(function(err, token, response) {
      if (err) {
        reject(err);
      } else {
        resolve(response.body);
      }
    });
  });
}
