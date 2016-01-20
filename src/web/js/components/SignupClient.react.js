'use strict';

var React = require('react');

/**
 * The SignupClient is the top level React class that manages signing up for
 * a Keybase account.
 */
var SignupClient = React.createClass({
  getInitialState: function() {
    return {
      state: 'signup'
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
  render: function() {
    if (this.state.state == 'signup') {
      return(
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
        </div>
      );
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
