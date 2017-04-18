'use strict';
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const request = require('request');
const Cookie = require('cookie');

const GoogleOAuth = require('./googleOAuth.js');
const GmailClient = require('./gmailClient.js');

const version = require('../package.json').version;

const flags = require('./flags.js');

// Configure Express
var app = express();

app.set('views', __dirname + '/web/views');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());

app.use(express.static('gen'));
app.use('/fonts', express.static(__dirname + '/web/fonts'));

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
    loggedIn: false,
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: version
  });
});

app.get('/about', function(req, res) {
  res.render('about', {
    toolname: flags.TOOLNAME,
    loggedIn: false,
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

app.get('/contact', function(req, res) {
  res.render('contact', {
    toolname: flags.TOOLNAME,
    loggedIn: false,
    staging: flags.KEYBASE_STAGING,
    electron: false,
    version: flags.VERSION
  });
});

app.get('/invite/getKey', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }
});

app.post('/invite/sendInvite', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }
});

app.get('/invite/viewInvite', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }
});

app.get('/invite', function(req, res) {
  if (flags.PRODUCTION) {
    res.status(404).send('404 Invites currently disabled');
    return;
  }
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

    let sessionCookieString = null;
    response.headers['set-cookie'].forEach((cookieString) => {
      let cookie = Cookie.parse(cookieString);
      if (cookie.session) {
        sessionCookieString = cookieString;
      }
    });

    // Echo the response with the same status code on success.
    // Attach the Keybase cookie as a custom header.
    res
      .header('X-Keybase-Cookie', sessionCookieString)
      .status(response.statusCode)
      .send(body);
  });
});

app.post('/keybase/signup.json', function(req, res) {
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

// TODO: This might not work without passing through the CSRF token.
app.post('/keybase/key/add.json', function(req, res) {
  request({
    method: 'POST',
    url: KEYBASE_URL + '/_/api/1.0/key/add.json',
    qs: req.query,
    jar: getKeybaseCookieJar(req),
  }, function(error, response, body) {
    if (error) {
      console.error(error);
      res.send(error);
    } else {
      res.send(body);
    }
  });
});

app.get('/keybase/key/fetch.json', function(req, res) {
  request({
    method: 'GET',
    url: KEYBASE_URL + '/_/api/1.0/key/fetch.json',
    qs: req.query,
    jar: getKeybaseCookieJar(req),
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
  res.redirect('/');
  request({
    method: 'POST',
    url: KEYBASE_URL + '/_/api/1.0/session/killall.json',
    jar: getKeybaseCookieJar(req)
  }, function(error, response, body) {
    if (!error) {
      console.log(body);
    } else {
      console.error('Failed to kill sessions: ' + error);
    }
  });
});

app.get('/version.json', function(req, res) {
  res.json({
    version: version
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
function getKeybaseCookieJar(req) {
  let cookieJar = request.jar();
  let cookieString = req.headers['x-keybase-cookie'];
  cookieJar.setCookie(cookieString, KEYBASE_URL);
  return cookieJar;
}
