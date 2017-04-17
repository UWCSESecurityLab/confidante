'use strict';
const flags = require('../../../flags');
const KeybaseAPI = require('../keybaseAPI');
const GoogleOAuth = require('../../../googleOAuth');
const openLink = require('../openLink');
const React = require('react');

let ipcRenderer;
if (flags.ELECTRON) {
  ipcRenderer = window.require('electron').ipcRenderer;
}

function redirectToGoogle() {
  if (flags.ELECTRON) {
    ipcRenderer.send('google-redirect');
  } else {
    window.location.href = GoogleOAuth.getAuthUrl();
  }
}

let Login = React.createClass({
  getInitialState: function() {
    return {
      emailOrUsername: '',
      password: '',
      loading: false,
      error: null
    };
  },

  login: function(e) {
    e.preventDefault();
    this.setState({ loading: true });

    KeybaseAPI.login(this.state.emailOrUsername, this.state.password)
      .then(function(response) {
        localStorage.setItem('keybase', JSON.stringify(response.me));
        localStorage.setItem('keybasePassphrase', this.state.password);

        // Check if there's a valid Google OAuth token we can reuse.
        let googleToken = GoogleOAuth.getAccessToken();
        if (!googleToken) {
          // If no token is stored, redirect to the Google OAuth login page.
          redirectToGoogle();
          return;
        }

        if (flags.ELECTRON) {
          // Redirect to the inbox. It will refresh the token if necessary
          // on that page.
          window.location.href = './mail.ejs';
        } else {
          // If there is a token, validate it with Google
          GoogleOAuth.web.validateToken(googleToken.access_token).then(function() {
            window.location.href = '/mail';
          }).catch(function() {
            // If it isn't good, have the user login again.
            redirectToGoogle();
          });
        }
      }.bind(this)).catch(function(error) {
        console.error(error);
        this.setState({
          error: error,
          loading: false
        });
      }.bind(this));
  },

  updateEmailOrUsername: function(e) {
    this.setState({ emailOrUsername: e.target.value });
  },

  updatePassword: function(e) {
    this.setState( {password: e.target.value });
  },

  render: function() {
    let errorMessage = null;
    if (this.state.error) {
      switch (this.state.error.status.name) {
        case 'BAD_LOGIN_USER_NOT_FOUND':
          errorMessage = 'We couldn\'t find that user on Keybase.';
          break;
        case 'BAD_LOGIN_PASSWORD':
          errorMessage = 'Incorrect email/username or password - please try again.';
          break;
        case 'INPUT_ERROR':
          if (this.state.error.status.desc === 'bad username or email') {
            errorMessage = 'Please enter a valid Keybase username or email address.';
          }
      }
    }

    let error = errorMessage ? (
      <div className="alert alert-danger" role="alert" id="error">
        {errorMessage}
      </div>
    ) : null;

    return (
      <section>
        <div className="container">
          <div className="login-flex">
            <div className="login-flex-item">
              <h3 className="login-text">
                <img className="login-icon" src={flags.ELECTRON ? '../img/keybase_icon.png' : 'keybase_icon.png'}/>
                Log in with Keybase
              </h3>
              <form id="login-form" onSubmit={this.login}>
                <div className="form-group">
                  <input value={this.state.emailOrUsername}
                          onChange={this.updateEmailOrUsername}
                          type="text"
                          className="form-control"
                          placeholder="Keybase Email or Username"
                          required/>
                </div>
                <div className="form-group">
                  <input value={this.state.password}
                          onChange={this.updatePassword}
                          type="password"
                          className="form-control"
                          id="password"
                          placeholder="Password"
                          required/>
                </div>
              </form>
              <div>
                <button className="btn btn-primary" type="submit" form="login-form" disabled={this.state.loading}>
                  { this.state.loading
                    ? 'Signing In...'
                    : 'Sign In'
                  }
                </button>
                { this.state.loading
                  ? <span className="spinner" id="spinner" aria-hidden="true"></span>
                  : null
                }
              </div>
              {error}
            </div>

            <div className="login-flex-item info-bar">
              <h3>How do I log into Confidante?</h3>
              <p>
                To log into Confidante, first you log in with
                your <a href="https://keybase.io" onClick={openLink} target="_blank">Keybase</a> account,
                and then your <a href="https://www.gmail.com/" onClick={openLink} target="_blank">Gmail</a> account.
                No separate Confidante account is necessary.
              </p>
              <h3>Don't have a Keybase account?</h3>
              <p>
                Sign up for a free Keybase account here!
              </p>
              <a href="https://keybase.io/" onClick={openLink} target="_blank" className="btn btn-primary" type="button">Sign up for Keybase</a>
            </div>
          </div>
        </div>
      </section>
    );
  }
});

module.exports = Login;
