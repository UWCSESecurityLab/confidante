'use strict';

var db = require('./db.js');
var GoogleOAuth = require('./googleOAuth.js');

// This module contains helper methods for checking authentication status in
// app.js.
module.exports = {
  isAuthenticated: isAuthenticated,
  isAuthenticatedWithGoogle: isAuthenticatedWithGoogle,
  isAuthenticatedWithKeybase: isAuthenticatedWithKeybase,
  webEndpoint: webEndpoint,
  dataEndpoint: dataEndpoint,
  attemptGoogleReauthentication: attemptGoogleReauthentication,
  isEric: isEric
};

/**
 * Express middleware to ensure the user is authenticated, for web pages.
 * Redirects to login page if not authenticated.
 */
function webEndpoint(req, res, next) {
  endpointAuthChecker(req, res, next, function(res) {
    res.redirect('/login');
  });
}
/**
 * Express middleware to ensure the user is authenticated, for data endpoints.
 * Sends bad status code if not authenticated.
 */
function dataEndpoint(req, res, next) {
  endpointAuthChecker(req, res, next, function(res) {
    res.status(401).send('You must be logged in to access this resource');
  });
}

/**
 * Generic authenticator for both web and data endpoints.
 * @param req, res, next - the standard middleware args
 * @param onNotAuthenticated - the function that should be called if the user
 *        could not be authenticated.
 */
function endpointAuthChecker(req, res, next, onNotAuthenticated) {
  if (isAuthenticated(req.session)) {
    next();
  } else if (!isAuthenticatedWithGoogle(req.session) && isAuthenticatedWithKeybase(req.session)) {
    attemptGoogleReauthentication(req.session).then(function() {
      next();
    }).catch(function() {
      onNotAuthenticated(res);
    });
  } else {
    onNotAuthenticated(res);
  }
}

/**
 * Returns whether the current session is fully authenticated by all linked
 * services.
 * @param session An express-session, typically req.session.
 * @return true if the session is authenticated, false otherwise.
 */
function isAuthenticated(session) {
  return isAuthenticatedWithKeybase(session) && isAuthenticatedWithGoogle(session);
}

/**
 * Returns whether the current session has a valid, non-expired Keybase cookie.
 * @param session An express-session, typically req.session.
 * @return true if the session is authenticated with Keybase, false otherwise.
 */
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

/**
 * Returns whether the current session has a valid, non-expired Google OAuth
 * access token.
 * @param session An express-session, typically req.session.
 * @return true if the session is authenticated with Google, false otherwise.
 */
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

/**
 * Try to reauthenticate the current user with Google, using their stored
 * refresh token.
 * @param The user's session
 * @return A promise, it resolves if the user's refresh token was found, and
 *         the access token was successfully refreshed. The new access token
 *         is stored in the session.
 *         It rejects if the user couldn't be found, if the refresh token
 *         doesn't exist, or it was unable to get a new access token from Google.
 */
function attemptGoogleReauthentication(session) {
  return new Promise(function(resolve, reject) {
    db.getUser(session.keybaseId).then(function(user) {
      if (!user) {
        reject('User ' + session.keybaseId + ' doesn\'t exist.');
      } else if (!user.google.refreshToken) {
        reject('Refresh token for ' + session.keybaseId + ' doesn\'t exist.');
      } else {
        GoogleOAuth.refreshAccessToken(user.google.refreshToken)
          .then(function(token) {
            session.googleToken = token;
            session.email = user.google.email;
            resolve();
          }).catch(function(err) {
            reject(err);
          });
      }
    }).catch(function(err) {
      reject(err);
    });
  });
}

function isEric(req, res, next) {
  if (req.session.keybaseId === '53d79d3655360f0b004d7cb62a4c8619') {
    next();
  } else {
    res.status(403);
  }
}
