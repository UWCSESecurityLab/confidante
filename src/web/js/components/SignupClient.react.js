'use strict';

var React = require('react');
var KeybaseAPI = require('../keybaseAPI.js');
var pgp = require('../../../pgp.js');

/**
 * The SignupClient is the top level React class that manages signing up for
 * a Keybase account.
 */
var SignupClient = React.createClass({
  getInitialState: function() {
    return {
      state: 'form'
    }
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

  signup: function() {
    this.setState({ state: 'spinner', status: 'Signing in...' });

    let keybaseAPI = new KeybaseAPI(this.state.username, this.state.password, window.location.origin);

    //keybaseAPI.signup(this.state.name, this.state.email, this.state.invite)
    //  .then(function(response) {
        this.setState({ status: 'Logging in...' });
        //return
        keybaseAPI.login()//;
      //}.bind(this))
      .then(function(response) {
        this.setState({ status: 'Generating Keys...'});
        return pgp.generateKeysForUpload(this.state.username + '@keybase.io', this.state.password);
      }.bind(this)).then(function(keys) {
        this.setState({ status: 'Adding keys to Keybase...'});
        return keybaseAPI.addKey(keys.publicKey, keys.p3skbPrivateKey);
      }.bind(this)).then(function() {
        this.setState({ state: 'completed' });
      }.bind(this)).catch(function(error) {
        this.setState({ state: 'form', error: error })
      }.bind(this));
  },

  render: function() {
    if (this.state.state == 'form') {
      return (
        <div className="box col-md-8 col-md-offset-2">
          <h2>Create a Keybase Account</h2>
          <form className="form-horizontal">
            <FormInput key="name" name="Name" onUpdate={this.updateName} />
            <FormInput key="email" name="Email" onUpdate={this.updateEmail} />
            <FormInput key="username" name="Username" onUpdate={this.updateUsername} />
            <FormInput key="pw" name="Password" type="password" onUpdate={this.updatePassword} />
            <FormInput key="confirm" name="Confirm Password" type="password" onUpdate={this.updateConfirm} />
            <FormInput key="invite" name="Keybase Invite" onUpdate={this.updateInvite} />
          </form>
          <div className="col-sm-10 col-sm-offset-2">
            <button onClick={this.signup} className="btn btn-primary">Submit</button>
            <div className="alert alert-danger" id="error">{this.state.error}</div>
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
      let profileLink = 'https://keybase.io/' + this.state.username;
      return (
        <div className="box col-md-8 col-md-offset-2">
          <h3>Your Keybase account is all set up!</h3>
          <p>
            We've created an account for you on <a href="https://keybase.io" target="_blank">Keybase</a>,
            and generated a new PGP key pair for encrypting your emails. You
            can visit and verify your Keybase profile at <a href={profileLink} target="_blank">{profileLink}</a>.</p>
          <p>
            Next, sign into your Gmail account so that you can view all of the
            encrypted messages in your Gmail inbox.
          </p>
          <a href="/auth/google" className="btn btn-success">Link with Gmail</a>
        </div>
      )
    } else {
      return <p>SignupClient error: invalid state</p>
    }
  }
});

var FormInput = React.createClass({
  render: function() {
    return (
      <div className="form-group">
        <label htmlFor={this.props.key} className="col-sm-2 control-label">{this.props.name}</label>
        <div className="col-sm-10">
          <input className="form-control"
                 type={this.props.type ? this.props.type : "text"}
                 name={this.props.key}
                 placeholder={this.props.name}
                 onChange={this.props.onUpdate}>
          </input>
        </div>
      </div>
    );
  }
});

module.exports = SignupClient;
