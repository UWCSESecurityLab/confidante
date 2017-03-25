'use strict';

const AuthError = require('./error.js').AuthError;
const flags = require('./flags.js');
const qs = require('querystring');
// We use request instead of xhr here, because Electron uses this library from
// the main process, which doesn't support XMLHttpRequest. Browserify will
// replace the request module with the xhr module when this library is compiled
// for the web version.
const request = require('request');
const UnsupportedError = require('./error.js').UnsupportedError;

const credentials = flags.ELECTRON
  ? require('../credentials/installed.json')
  : require('../credentials/web.json');

let ipcRenderer;
if (flags.ELECTRON && process.type === 'renderer') {
  ipcRenderer = window.require('electron').ipcRenderer;
}

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
let GOOGLE_OAUTH_REDIRECT_URI;
if (flags.ELECTRON) {
  GOOGLE_OAUTH_REDIRECT_URI = 'http://127.0.0.1:';
} else if (flags.PRODUCTION && (flags.TOOLNAME === 'Keymail' || flags.TOOLNAME === 'Confidante')) {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[0];
} else if (flags.PRODUCTION && flags.TOOLNAME === 'Mailsafe') {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[2];
} else {
  GOOGLE_OAUTH_REDIRECT_URI = credentials.web.redirect_uris[1];
}

let GoogleOAuth = {
  /**
   * Get the URL to start Google's OAuth flow.
   * @param port {number} For Electron mode, the port that the app is listening
   * for an Authorization code on.
   */
  getAuthUrl: function(port) {
    let scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ].join(' ');


    let args;
    if (flags.ELECTRON) {
      args = {
        response_type: 'code',
        client_id: credentials.installed.client_id,
        redirect_uri: GOOGLE_OAUTH_REDIRECT_URI + port,
        scope: scopes
      };
    } else {
      args = {
        response_type: 'token',
        client_id: credentials.web.client_id,
        redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
        scope: scopes
      };
    }
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
    let raw;
    if (flags.ELECTRON) {
      raw = ipcRenderer.sendSync('get-access-token');
    } else {
      raw = localStorage.getItem('oauth');
    }
    if (!raw) {
      return null;
    }
    try {
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
      if (flags.ELECTRON) {
        return Promise.reject(new UnsupportedError('validateToken should not be called from Electron.'));
      }
      return new Promise(function(resolve, reject) {
        request.get({
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
    requestAccessToken: function(authCode, port) {
      return new Promise(function(resolve, reject) {
        let params = qs.stringify({
          code: authCode,
          client_id: credentials.installed.client_id,
          client_secret: credentials.installed.client_secret,
          redirect_uri: GOOGLE_OAUTH_REDIRECT_URI + port,
          grant_type: 'authorization_code'
        });

        request.post({
          url: 'https://www.googleapis.com/oauth2/v4/token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        }, function(err, response, body) {
          if (err) {
            reject(err);
          } else if (response.statusCode !== 200) {
            reject(body);
          } else {
            resolve(body);
          }
        });
      });
    }
  }
};

module.exports = GoogleOAuth;
