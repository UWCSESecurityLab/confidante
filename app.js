'use strict';

var util = require('util');
var url = require('url');

var express = require('express');
// var expressLayouts = require('express-ejs-layouts')
var logger = require('express-logger');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var methodOverride = require('method-override');

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
  console.log('MongoDB error: ' + error);
});

var app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// app.use(expressLayouts);

app.use(logger({path: __dirname + "logfile.txt"}));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(methodOverride());

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: store
}));

app.get('/', function(req, res) {
  res.render('index', { loggedIn: !!req.session.googleToken });
});

app.get('/account', ensureAuthenticated, function(req, res){
  var oauth2Client = new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );

  oauth2Client.credentials = req.session.googleToken

  var gmailClient = new GmailClient(oauth2Client);
  gmailClient.listLabels(function(labels) {
    res.render('account', { labels: labels });
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/auth/google', function(req, res) {
  var oauth2Client = new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
    redirect_uri: credentials.web.redirect_uris[0]
  });

  res.redirect(authUrl);
});

app.get('/auth/google/return', function(req, res) {
  // Exchange authorization code for access token
  var code = req.query.code;

  if (!code) {
    res.redirect('/login');
  }

  var oauth2Client = new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );

  oauth2Client.getToken(code, function(err, token) {
    if (err) {
      console.log('Error while tring to retrieve access token', err);
      return;
    }
    oauth2Client.credentials = token;
    req.session.googleToken = token;
    res.redirect('/');
  });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.listen(3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.session.googleToken) { return next(); }
  res.redirect('/login')
}
