var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var passport = require('passport');
var logger = require('express-logger');
var session = require('express-session');
var util = require('util');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var expressLayouts = require('express-ejs-layouts')
var mongoose = require('mongoose')
var MongoSessionStore = require('connect-mongodb-session')(session)
var User = require('./models/user.js')
var credentials = require('./client_secret.json');
var inspect = require('util').inspect;
var GmailClient = require('./gmailClient.js');

// Mongo session store setup.
store = new MongoSessionStore({
  uri: 'mongodb://localhost:27017/test',
  collection: 'mySessions'
});
store.on('error', function(error) {
  console.log('MongoDB error: ' + error);
});

// User model.
mongo = mongoose.connect('mongodb://localhost/test');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user.googleId);
});

passport.deserializeUser(function(obj, done) {
  User.findOne({ 'googleId': obj }, function(err, user) {
    done(null, user);
  });
});

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
    clientID: credentials.web.client_id,
    clientSecret: credentials.web.client_secret,
    callbackURL: 'http://localhost:3000/auth/google/return',
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

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(expressLayouts)
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
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/../../public'));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  var gmailClient = new GmailClient(req.user);
  gmailClient.listLabels(function(labels) {
    console.log('listLabels returned: ' + labels);
    res.render('account', { user: req.user, labels: labels });
  });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callbackj
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://mail.google.com'
    ],
    accessType: 'offline',
  }),
  function(req, res) {
    // The request will be redirected to Google for authentication, so this
    // function will not be called.
  }
);

// GET /auth/google/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/return',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

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
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
