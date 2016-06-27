'use strict';

var React = require('react');
var KeybaseAPI = require('../keybaseAPI.js');
var pgp = require('../../../pgp.js');

/**
 * The SignupClient is the top level React class that manages signing up for
 * a Keybase account.
 */
var SignupClient = React.createClass({
  propTypes: {
    toolname: React.PropTypes.string
  },
  getInitialState: function() {
    return {
      state: 'form',
      error: ''
    };
  },
  updateName: function(e) {
    this.setState({ name: e.target.value });
  },
  updateEmail: function(e) {
    this.setState({ email: e.target.value });
  },
  updateUsername: function(e) {
    this.setState({ username: e.target.value });
  },
  updatePassword: function(e) {
    this.setState({ password: e.target.value });
  },
  updateConfirm: function(e) {
    this.setState({ confirm: e.target.value });
  },
  updateInvite: function(e) {
    this.setState({ invite: e.target.value });
  },

  signup: function(e) {
    e.preventDefault();
    if (this.state.password != this.state.confirm) {
      this.setState({ error: 'Passwords do not match!', password: '', confirm: '' });
      return false;
    }

    this.setState({ state: 'spinner', status: 'Signing up...' });
    KeybaseAPI.signup(
        this.state.name,
        this.state.email,
        this.state.username,
        this.state.password,
        KeybaseAPI.isStaging() ? 'stage0' : this.state.invite
      ).then(function() {
        this.setState({ status: 'Logging in...' });
        return KeybaseAPI.login(this.state.username, this.state.password);
      }.bind(this)).then(function() {
        this.setState({ status: 'Generating Keys...'});
        return pgp.generateKeysForUpload(this.state.username + '@keybase.io', this.state.password);
      }.bind(this)).then(function(keys) {
        this.setState({ status: 'Adding keys to Keybase...'});
        return KeybaseAPI.addKey(keys.publicKey, keys.p3skbPrivateKey);
      }.bind(this)).then(function() {
        // Login again because we want to re-retrieve the update user object
        // with private keys
        return KeybaseAPI.login(this.state.username, this.state.password);
      }.bind(this)).then(function(loginBody) {
        localStorage.setItem('keybase', JSON.stringify(loginBody.me));
        localStorage.setItem('keybasePassphrase', this.state.password);
        this.setState({ state: 'completed' });
      }.bind(this)).catch(function(error) {
        this.setState({ state: 'form', error: error, password: '', confirm: '' });
      }.bind(this));
    return false;
  },

  render: function() {
    if (this.state.state == 'form') {
      return (
        <div className="box col-md-8 col-md-offset-2">
          <h2>Create a Keybase Account</h2>
          <p>
            To get started with {this.props.toolname}, first you need
            to set up a Keybase account. We use Keybase to store your
            cryptographic keys.
          </p>
          <p>
            For more info, visit <a href={KeybaseAPI.url()} target="_blank">keybase.io</a>
          </p>
          <form className="form-horizontal" autoComplete="off" onSubmit={this.signup}>
            <FormInput name="name" placeholder="Name" value={this.state.name} onUpdate={this.updateName} />
            <FormInput name="email" placeholder="Email" value={this.state.email} onUpdate={this.updateEmail} />
            <FormInput name="username" placeholder="Username" value={this.state.username} onUpdate={this.updateUsername} />
            <FormInput name="pw" placeholder="Password" type="password" minLength="12" value={this.state.password} onUpdate={this.updatePassword} />
            <FormInput name="confirm" placeholder="Confirm Password" type="password" minLength="12" value={this.state.confirm} onUpdate={this.updateConfirm} />
            { KeybaseAPI.isStaging() ? null
              : <FormInput name="invite" placeholder="Keybase Invite" value={this.state.invite} onUpdate={this.updateInvite} />
            }
            <div className="col-sm-10 col-sm-offset-2">
              <button className="btn btn-primary">Submit</button>
            </div>
          </form>
          <div className="alert alert-danger col-sm-10 col-sm-offset-2" id="error">
            { typeof this.state.error == 'object' ?
              <p>Oops! We couldn't create your account because:<br/>
              {this.state.error.status.name}: {this.state.error.status.desc}</p>
              : this.state.error }
          </div>
        </div>
      );
    } else if (this.state.state == 'spinner') {
      return (
        <div className="box col-md-8 col-md-offset-2 loading">
          <div className="large-spinner"></div>
          <p>{this.state.status}</p>
        </div>
      );
    } else if (this.state.state == 'completed') {
      let profileLink = KeybaseAPI.url() + '/' + this.state.username;
      return (
        <div className="box col-md-8 col-md-offset-2">
          <h3>Your Keybase account is all set up!</h3>
          <p>
            We've created an account for you on <a href={KeybaseAPI.url()} target="_blank">Keybase</a>,
            and generated a new PGP key pair for encrypting your emails. You
            can visit and verify your Keybase profile at <a href={profileLink} target="_blank">{profileLink}</a>.</p>
          <p>
            Next, sign into your Gmail account so that you can view all of the
            encrypted messages in your Gmail inbox.
          </p>
          <a href="/auth/google" className="btn btn-success">Link with Gmail</a>
        </div>
      );
    } else {
      return <p>SignupClient error: invalid state</p>;
    }
  }
});

var FormInput = React.createClass({
  propTypes: {
    minLength: React.PropTypes.string,
    name: React.PropTypes.string,
    onUpdate: React.PropTypes.func,
    placeholder: React.PropTypes.string,
    type: React.PropTypes.string,
    value: React.PropTypes.string
  },
  render: function() {
    return (
      <div className="form-group">
        <label htmlFor={this.props.name} className="col-sm-2 control-label">
          {this.props.placeholder}
        </label>
        <div className="col-sm-10">
          <input className="form-control"
                 type={this.props.type ? this.props.type : 'text'}
                 name={this.props.name}
                 value={this.props.value}
                 minLength={this.props.minLength ? this.props.minLength : null}
                 placeholder={this.props.placeholder}
                 onChange={this.props.onUpdate}
                 required>
          </input>
        </div>
      </div>
    );
  }
});

module.exports = SignupClient;
