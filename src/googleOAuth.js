'use strict';

var credentials = require('../client_secret.json');
var flags = require('./flags.js');
var GoogleAuthLibrary = require('google-auth-library');

let GOOGLE_OAUTH_REDIRECT_URI;
if (flags.PRODUCTION && (flags.TOOLNAME === 'Keymail' || flags.TOOLNAME === 'Confidante')) {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[0];
} else if (flags.PRODUCTION && flags.TOOLNAME === 'Mailsafe') {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[2];
} else {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[1];
}

/**
 * Constructs a Google OAuth client with the app's credentials.
 */
let buildClient = function() {
  var googleAuth = new GoogleAuthLibrary();
  return new googleAuth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    GOOGLE_OAUTH_REDIRECT_URI
  );
}
exports.buildClient = buildClient;

/**
 * Redirects the user to a Google login to start the OAuth flow.
 */
exports.redirectToGoogleOAuthUrl = function(req, res) {
  var oauth2Client = buildClient();
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI
  });
  res.redirect(authUrl);
}

/**
 * Requests an access token and refresh token (if applicable) from Google.
 * @param authCode the authorization code sent in the OAuth callback
 * @return Promise containing the access token/refresh token object
 */
exports.getInitialTokens = function(authCode) {
  return new Promise(function(resolve, reject) {
    var oauth2Client = buildClient();
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
exports.refreshAccessToken = function(refreshToken) {
  return new Promise(function(resolve, reject) {
    var oauth2Client = buildClient();
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
