'use strict';

var util = require('util');
var url = require('url');

var express = require('express');
var expressLayouts = require('express-ejs-layouts');
var logger = require('express-logger');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');

var mongoose = require('mongoose');
var MongoSessionStore = require('connect-mongodb-session')(session);

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth2').Strategy;

var googleAuthLibrary = require('google-auth-library');
var googleAuth = new googleAuthLibrary();

var credentials = require('./client_secret.json');
var GmailClient = require('./gmailClient.js');
var User = require('./models/user.js')

// Mongo session store setup
var store = new MongoSessionStore({
  uri: 'mongodb://localhost:27017/test',
  collection: 'mySessions'
});
store.on('error', function(error) {
  console.log('MongoDB error: ' + error);
});

// User model setup
mongoose.connect('mongodb://localhost/test');

// Passport setup
passport.serializeUser(function(user, done) {
  done(null, user.googleId);
});

passport.deserializeUser(function(obj, done) {
  User.findOne({ 'googleId': obj }, function(err, user) {
    done(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: credentials.web.client_id,
    clientSecret: credentials.web.client_secret,
    callbackURL: credentials.web.redirect_uris[0]
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({
      googleId: profile.id
    }, function(err, user) {
      if (err) {
        console.log('Error finding user');
        console.log(err);
      }
      if (user === null) {
        var user = new User({
          googleId: profile.id,
          profile: profile,
          accessToken: accessToken,
          refreshToken: refreshToken
        });
        user.save(function(err) {
          if (err) {
            console.log('Error saving user');
            console.log(err);
          }
        });
      } else {
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        user.save(function(err) {
          if (err) {
            console.log('Error saving user');
            console.log(err);
          }
        });
      }
      return done(null, user);
    });
  }
));

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(expressLayouts);
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

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res) {
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  var gmailClient = new GmailClient(req.user.accessToken, req.user.refreshToken);
  gmailClient.listLabels(function(labels) {
    res.render('account', { labels: labels, user: req.user });
  });
});

app.get('/login', function(req, res) {
  res.render('login', { user: req.user });
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/gmail.modify', 'email']
  })
);

app.get('/auth/google/return',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/auth/google/failure'
  })
);

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.listen(3000);
console.log('Server running');
console.log('Listening on port 3000');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
