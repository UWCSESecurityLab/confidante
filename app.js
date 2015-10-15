'use strict';

var util = require('util');

var express = require('express');
var expressLayouts = require('express-ejs-layouts')
var session = require('express-session');

var mongoose = require('mongoose')
var MongoSessionStore = require('connect-mongodb-session')(session)
var googleAuthLibrary = require('google-auth-library');
var googleAuth = new googleAuthLibrary();

var credentials = require('./client_secret.json');
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

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(expressLayouts);

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: store
}));

app.get('/', function(req, res) {
  res.render('index', { loggedIn: !!req.session.googleToken, email: req.session.email });
});

app.get('/account', ensureAuthenticated, function(req, res){
  var gmailClient = new GmailClient(req.session.googleToken);

  gmailClient.listLabels().then(function(labels) {
    res.render('account', { labels: labels, loggedIn: !!req.session.googleToken });
  });
});

app.get('/login', function(req, res) {
  res.render('login', { loggedIn: !!req.session.googleToken });
});

app.get('/inbox', ensureAuthenticated, function(req, res) {
  var gmailClient = new GmailClient(req.session.googleToken);
  gmailClient.getEncryptedInbox().then(function(threads) {
    res.render('inbox', { threads: threads, loggedIn: !!req.session.googleToken })
  });
});

app.get('/auth/google', function(req, res) {
  var oauth2Client = new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'https://www.googleapis.com/auth/gmail.modify'],
    redirect_uri: credentials.web.redirect_uris[0]
  });
  res.redirect(authUrl);
});

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
  var tokenPromise = getGoogleOAuthToken(code);
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
      storeGoogleCredentials(email, token.refresh_token).then(function() {
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

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.listen(3000);

/**
 * Requests an access token and refresh token (if applicable) from Google.
 * @param authCode the authorization code sent in the OAuth callback
 * @return Promise containing the token object
 */
function getGoogleOAuthToken(authCode) {
  return new Promise(function(resolve, reject) {
    var oauth2Client = new googleAuth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );

    oauth2Client.getToken(authCode, function(err, token) {
      if (err) {
        reject(Error('Error while tring to retrieve access token' + err));
      }
      resolve(token);
    });
  });
}

/**
 * Creates or updates a User's Google credentials.
 * @param email The user's email address
 * @param refreshToken The Google OAuth refresh Token
 * @return Empty Promise
 */
function storeGoogleCredentials(email, refreshToken) {
  return new Promise(function(resolve, reject) {
    User.findOne({'google.email': email}, function(err, user) {
      if (err) reject(err);
      if (user) {
        user.google.refreshToken = refreshToken;
        user.save(function(err) {
          if (err) reject(err);
          resolve();
        });
      } else {
        var user = new User({
          google: {
            email: email,
            refreshToken: refreshToken
          }
        });
        user.save(function(err) {
          if (err) reject(err);
          resolve();
        });
      }
    });
  });
}

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.session.googleToken) {
    var tokenExpiry = new Date(req.session.googleToken.expiry_date);
    var now = new Date();
    if (tokenExpiry - now <= 0) {
      delete req.session.googleToken;
      res.redirect('/login');
    }
    return next();
  }
  res.redirect('/login')
}
