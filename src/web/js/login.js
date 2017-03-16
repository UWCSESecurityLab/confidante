'use strict';
const GoogleOAuth = require('../../googleOAuth');
const KeybaseAPI = require('./keybaseAPI');

let submit = document.getElementById('submit');
submit.onclick = login;

let spinner = document.getElementById('spinner');
spinner.style.visibility = 'hidden';

// Submit on enter key
document.onkeydown = function(event) {
  if (event.keyCode == 13) {
    login();
  }
};

function login() {
  removeError();
  spinner.style.visibility = 'visible';

  let emailOrUsername = document.getElementById('username').value;
  let password = document.getElementById('password').value;

  KeybaseAPI.login(emailOrUsername, password).then(function(response) {
    localStorage.setItem('keybase', JSON.stringify(response.me));
    localStorage.setItem('keybasePassphrase', password);

    // Check if there's a valid Google OAuth token we can reuse.
    let googleToken = GoogleOAuth.getAccessToken();
    if (!googleToken) {
      // If no token is stored, redirect to the Google OAuth login page.
      window.location.href = GoogleOAuth.getAuthUrl();
      return;
    }
    // If there is a token, validate it with Google
    GoogleOAuth.web.validateToken(googleToken.access_token).then(function() {
      window.location.href = '/mail';
    }).catch(function() {
      // If it isn't good, have the user login again.
      window.location.href = GoogleOAuth.getAuthUrl();
    });

  }).catch(function(error) {
    console.error(error);
    spinner.style.visibility = 'hidden';
    addError('An error occurred when logging in<br/>' + error.status.name + ': ' + error.status.desc);
  });
}

function addError(message) {
  let error = document.getElementById('error');
  error.innerHTML = message;
  error.style.visibility = 'visible';
}

function removeError() {
  let error = document.getElementById('error');
  error.style.visibility = 'hidden';
}
