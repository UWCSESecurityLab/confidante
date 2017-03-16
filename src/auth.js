'use strict';

// This module contains helper methods for checking authentication status in
// app.js.
module.exports = {
  isAuthenticated: isAuthenticated,
  isAuthenticatedWithKeybase: isAuthenticatedWithKeybase,
  webEndpoint: webEndpoint,
  dataEndpoint: dataEndpoint,
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
  return isAuthenticatedWithKeybase(session);
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

function isEric(req, res, next) {
  if (req.session.keybaseId === '53d79d3655360f0b004d7cb62a4c8619') {
    next();
  } else {
    res.status(403);
  }
}
