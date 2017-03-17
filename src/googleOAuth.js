'use strict';

const {AuthError} = require('./error.js');
const credentials = require('../client_secret.json'); // TODO: figure out how to securely package credentials
const flags = require('./flags.js');
const qs = require('querystring');
const xhr = require('xhr');

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
let GOOGLE_OAUTH_REDIRECT_URI;
if (flags.PRODUCTION && (flags.TOOLNAME === 'Keymail' || flags.TOOLNAME === 'Confidante')) {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[0];
} else if (flags.PRODUCTION && flags.TOOLNAME === 'Mailsafe') {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[2];
} else {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[1];
}

let GoogleOAuth = {
  /**
   * Get the URL to start Google's OAuth flow.
   */
  getAuthUrl: function() {
    let scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ].join(' ');

    let args = {
      response_type: 'token',
      client_id: credentials.web.client_id,
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
      scope: scopes
    };
    return GOOGLE_OAUTH_URL + '?' + qs.stringify(args);
  },

  /**
   * Stores an access token in localStorage.
   * @param {object} token The access token object retrieved from Google.
   */
  storeAccessToken: function(token) {
    localStorage.setItem('oauth', JSON.stringify(token));
  },

  /**
   * Retrieves an access token from localStorage.
   * @return {object} The access token object retrieved from Google, or null
   * if it doesn't exist or is invalid.
   */
  getAccessToken: function() {
    try {
      let raw = localStorage.getItem('oauth');
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  web: {
    /**
     * Extract the access token from the response from Google OAuth.
     * @param {string} url The redirect url called by Google.
     * @return {object} The access token object encoded in the URL.
     */
    parseTokenFromUrl: function(url) {
      let token = qs.parse(url.split('#')[1]);
      if (token.error) {
        console.log('err');
      } else {
        return token;
      }
    },

    /**
     * Check with Google to make sure the token isn't forged/expired.
     * @param {string} accessToken The access token retrieved from Google.
     * @return {Promise} Empty on success, on error, an object with a code and msg.
     */
    validateToken: function(accessToken) {
      return new Promise(function(resolve, reject) {
        xhr.get({
          url: 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + accessToken
        }, function(error, response, body) {
          if (error) {
            reject(new AuthError('Invalid access token (rejected by Google).'));
            return;
          }
          let tokenInfo = JSON.parse(body);
          if (tokenInfo.aud !== credentials.web.client_id) {
            reject(new AuthError('The provided access token\'s client ID does not match the app\'s client id.'));
          } else if (tokenInfo.expires_in < 0 || tokenInfo.exp < Date.now()/1000) {
            reject(new AuthError('The access token has expired.'));
          } else {
            resolve();
          }
        });
      });
    }
  },

  installed: {
    // TODO: implement OAuth for installed applications
  }
};

module.exports = GoogleOAuth;
