'use strict';

var util = require('util');

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');

var request = require('request');
var Cookie = require('cookie');

var mongoose = require('mongoose')
var MongoSessionStore = require('connect-mongodb-session')(session)
var googleAuthLibrary = require('google-auth-library');

var credentials = require('../client_secret.json');
var GmailClient = require('./gmailClient.js');
var User = require('./models/user.js')

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
app.use(express.static(__dirname + '/web/js'));
app.use(express.static(__dirname + '/web/html'));
app.use(express.static(__dirname + '/web/css'));

app.get('/', function(req, res) {
  res.render('index', {
    email: req.session.email,
    loggedIn: isAuthenticated(req.session)
  });
});

app.get('/login', function(req, res) {
  if (isAuthenticated(req.session)) {
    res.redirect('/mail');
  } else {
    res.render('login', { email: req.session.email, loggedIn: false });
  }
});

app.get('/mail', ensureAuthenticated, function(req, res) {
  res.render('mail', { email: req.session.email, loggedIn: true });
});

app.get('/inbox', ensureAuthenticated, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.getEncryptedInbox().then(function(threads) {
    res.json(threads);
  });
});

app.get('/fakeInbox', function(req, res) {
  res.json({
    emails: [
      { id: 0, to: 'A', from: 'Jane', subject: 'Jane sent this email' },
      { id: 1, to: 'A', from: 'Janus', subject: 'Janus sent this email' },
      { id: 2, to: 'A', from: 'Jacqueline', subject: 'Jacqueline sent this email' },
      { id: 3, to: 'A', from: 'Jo', subject: 'Jo sent this email' },
      { id: 4, to: 'A', from: 'Jane', subject: 'Jane sent this email as well' },
      { id: 5, to: 'A', from: Math.random().toString(36).substring(7),
               subject: Math.random().toString(36).substring(7) }
    ]
  });
});

app.post('/sendMessage', ensureAuthenticated, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.sendMessage({
    headers: {
      to: [req.body.to],
      from: req.session.email,
      subject: req.body.subject,
      date: new Date().toString()
    },
    body: req.body.email
  }).then(function(response) {
    res.status(200).send('OK');
  }).catch(function(error) {
    res.status(500).send(error);
  });
});

/**
 * Authenticates the user with Google. The user must have already been
 * authenticated with Keybase so we can identify them.
 */
app.get('/auth/google', function(req, res) {
  User.findOne({'keybase.id': req.session.keybaseId}, function(err, user) {
    if (err) {
      res.statusCode(500).send(err);
    }
    if (!user) {
      // If there is no Keybase id, send them back to the initial login.
      res.redirect('/login');
    }

    if (user.google.refreshToken) {
      // If the user has logged in with Google before, get an access token
      // using the refresh token.
      refreshGoogleOAuthToken(user.google.refreshToken).then(
        function(token) {
          req.session.googleToken = token;
          req.session.email = user.google.email;
          res.redirect('/mail');
      }).catch(function(err) {
        redirectToGoogleOAuthUrl(res, req);
      });
    } else {
      redirectToGoogleOAuthUrl(res, req);
    }
  });
});

function redirectToGoogleOAuthUrl(res, req) {
  // Otherwise, we need to send them through the Google OAuth flow.
  var oauth2Client = buildGoogleOAuthClient();
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'https://www.googleapis.com/auth/gmail.modify'],
    redirect_uri: credentials.web.redirect_uris[0]
  });
  res.redirect(authUrl);
}

/**
 * Exchanges an authorization code for tokens from Google, and updates the
 * session and user store.
 */
app.get('/auth/google/return', function(req, res) {
  var code = req.query.code;
  if (!code) {
    console.error('No authorization code in query string!');
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
      storeGoogleCredentials(
        req.session.keybaseId,
        email,
        token.refresh_token
      ).then(function() {
        res.redirect('/')
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
  request({
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
      storeKeybaseCredentials(keybase).then(function() {
        // Echo the response with the same status code on success.
        res.status(response.statusCode).send(body);
      }).catch(function(mongoError) {
        req.session.destroy(function(sessionError) {
          res.status(500).send(mongoError);
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

/**
 * Creates and stores new User from their Keybase credentials. If the user has
 * already used our service, then nothing needs to be updated.
 * @param keybase The login object returned from the Keybase API
 * @return an empty promise
 */
function storeKeybaseCredentials(keybase) {
  return new Promise(function(resolve, reject) {
    User.findOne({'keybase.id': keybase.me.id}, function(err, user) {
      if (err) {
        reject(err);
        return;
      }
      if (user) {
        resolve();
      } else {
        // Currently we only store the id. We can store other non-sensitive
        // info here in the future, like the profile picture.
        var user = new User({
          keybase: {
            id: keybase.me.id
          }
        });
        user.save(function(err) {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

/**
 * Creates or updates a User's Google credentials.
 * @param keybaseId The identifier for the user
 * @param email The user's email address
 * @param refreshToken The Google OAuth refresh Token
 * @return Empty Promise
 */
function storeGoogleCredentials(keybaseId, email, refreshToken) {
  return new Promise(function(resolve, reject) {
    User.findOne({'keybase.id': keybaseId}, function(err, user) {
      if (err) {
        reject(err);
        return;
      }
      if (user) {
        user.google.refreshToken = refreshToken;
        user.google.email = email;
        user.save(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        reject('Could not find user');
      }
    });
  });
}

function isAuthenticated(session) {
  return isAuthenticatedWithKeybase(session) && isAuthenticatedWithGoogle(session);
}

function isAuthenticatedWithKeybase(session) {
  if (!session.keybaseId || !session.keybaseCookie) {
    return false;
  }
  var now = new Date();
  var expires = new Date(session.keybaseCookie.Expires);
  if (expires - now <= 0) {
    delete session.keybaseId;
    delete session.keybaseCookie;
    return false;
  }
  return true;
}

function isAuthenticatedWithGoogle(session) {
  if (!session.googleToken || !session.email) {
    return false;
  }

  var expires = new Date(session.googleToken.expiry_date);
  var now = new Date();
  if (expires - now <= 0) {
    delete session.googleToken;
    delete session.email;
    return false;
  }
  return true;
}

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (isAuthenticated(req.session)) {
    return next();
  }
  res.redirect('/login')
}
