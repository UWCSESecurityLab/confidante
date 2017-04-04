'use strict';
const flags = require('../../../flags');
const KeybaseAPI = require('../keybaseAPI');
const GoogleOAuth = require('../../../googleOAuth');
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

  componentDidMount: function() {
    if (!flags.ELECTRON) {
      if (KeybaseAPI.keybaseLoggedIn()) {
        window.location.href = '/mail';
      }
    }

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
    let errorMessage = this.state.error ? (
      <div className="alert alert-danger" role="alert" id="error">
        An error occured when logging in.
        <br/>
        {this.state.error.status.name + ': ' + this.state.error.status.desc}
      </div>
    ) : null;

    return (
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <form id="login-form" onSubmit={this.login}>
              <h2>Sign in with your Keybase Account</h2>
              { flags.ELECTRON
                ? <img src="../img/keybase_logo.png" id="keybase-logo"/>
                : <img src="keybase_logo.png" id="keybase-logo"/>
              }
              <div className="form-group">
                <input value={this.state.emailOrUsername}
                       onChange={this.updateEmailOrUsername}
                       type="text"
                       className="form-control"
                       placeholder="Email or Username"/>
              </div>
              <div className="form-group">
                <input value={this.state.password}
                       onChange={this.updatePassword}
                       type="password"
                       className="form-control"
                       id="password"
                       placeholder="Password"/>
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
          {errorMessage}
        </div>
        <div className="col-md-1"></div>
        <div className="col-md-5"></div>
          <h3>Don't have a Keybase Account?</h3>
          <p>
            Keybase is a directory of people and their PGP keys. We use Keybase to
            make encrypting and decrypting your mail easier.
          </p>
          { flags.ELECTRON
            ? <button className="btn btn-primary" href="signup.ejs">Sign Up</button>
            : <button className="btn btn-primary" href="/signup">Sign Up</button>
          }
          <a className="btn btn-info" href="https://keybase.io" target="_blank">
            Learn More
          </a>
        </div>
      </div>
    );
  }
});

module.exports = Login;

