'use strict'

// This module contains helper methods for checking authentication status in
// app.js.
module.exports = {
  isAuthenticated: isAuthenticated,
  isAuthenticatedWithGoogle: isAuthenticatedWithGoogle,
  isAuthenticatedWithKeybase: isAuthenticatedWithKeybase,
  webEndpoint: webEndpoint,
  dataEndpoint: dataEndpoint
}

/**
 * Express middleware to ensure the user is authenticated, for web pages.
 * Redirects to login page if not authenticated.
 */
function webEndpoint(req, res, next) {
  if (isAuthenticated(req.session)) {
    return next();
  }
  res.redirect('/login');
}
/**
 * Express middleware to ensure the user is authenticated, for data endpoints.
 * Sends bad status code if not authenticated.
 */
function dataEndpoint(req, res, next) {
  if (isAuthenticated(req.session)) {
    next();
  } else {
    res.status(401).send('You must be logged in to access this resource');
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
