var React = require('react');
var ReactDOM = require('react-dom');
var request = require('request');
var keybaseAPI = require('./keybaseAPI');
var kbpgp = require('kbpgp');

var Email = React.createClass({
  getInitialState: function() {
    return {
      checked: false,
    } 
  },
  handleChange: function(e) {
    console.log(e);
  },
  render: function() {
    return (
      <div className='emailRow'>
        <input type='checkbox' value={this.state.checked} onchange={this.handleChange}></input>
        <span className='from'> {this.props.from} </span>
        <span className='subject'> {this.props.subject} </span>
        <span className='body'> {this.props.body} </span>
      </div>
    );
  }
});

function getHeader(thread, header) {
  var headers = thread.messages[0].payload.headers;
  for (var i=0; i<headers.length; i++) {
    var h = headers[i];
    if (h.name === header) {
      return h.value;
    }
  }
  return '<<NO ' + header + 'FOUND>>';

}
var Inbox = React.createClass({
  getInitialState: function() {
    return {
      emails: [ ],
      listname: 'Inbox',
    }
  },

  loadMail: function() {
    request(
      { method: 'GET',
        url: 'http://localhost:3000/inbox' 
      }, 
      function(error, response, body) {
        if (!error) {
          body = JSON.parse(body);
          var emails = []
          body.forEach(function(thread) {
            emails.push(
              { subject: getHeader(thread, 'Subject'),
                from: getHeader(thread, 'From'),
                id: thread.id,
                to: getHeader(thread, 'To')
              }
            );
          });
          this.setState({emails: emails});
        }
      }.bind(this));
  },

  componentDidMount: function() {
    this.loadMail();
    setInterval(this.loadMail, 5000);
  },

  render: function() {
    var emails = this.state.emails.map(function(email) {
      return <li key={email.id}> <Email from={email.from} subject={email.subject} /> </li>
    });
    if (emails.length == 0) {
      return (
        <div>
          <h3> {this.state.listname} </h3>
          No email!
        </div>
      )
    }
    return (
      <div>
        <h3> {this.state.listname} </h3>
        <ul>
          {emails}
        </ul>
      </div>
    );
  }
});

var ComposeArea = React.createClass({
  getInitialState: function() {
    return {
      to: '',
      KBto: '',
      subject: '',
      email: '',
      feedback: 'Hello',
    }
  },
  updateTo: function(e) {
    this.setState({ to: e.target.value });
  },
  updateKBTo: function(e) {
    this.setState({ KBto: e.target.value });
  },
  updateSubject: function(e) {
    this.setState({ subject: e.target.value });
  },
  updateEmail: function(e) {
    this.setState({ email: e.target.value });
  },
  encryptEmail: function(keyManager) {
    return new Promise(function(fulfill, reject) {
      var params = {
        msg: this.state.email,
        encrypt_for: keyManager
      };
      kbpgp.box(params, function(err, result_string, result_buffer) {
        if (!err) {
          fulfill(result_string);
        } else {
          reject(err);
        }
      });
    }.bind(this));
  },
  send: function(e) {
    keybaseAPI.publicKeyForUser(this.state.KBto).then(keybaseAPI.managerFromPublicKey)
                                                .then(this.encryptEmail)
                                                .then(function(encryptedEmail) {
        var email = {
          to: this.state.to,
          subject: this.state.subject,
          email: encryptedEmail
        }

        console.log('Sending encrypted mail to ' + this.state.to);
        request( 
                { method: 'POST',
                  url: 'http://localhost:3000/sendMessage',
                  json: true,
                  body: email
                }, function(error, response, body) {
                  if (error) {
                    // Tell the user about the error.
                    console.log('Error send (network error, server down, etc.).');
                    this.setState({ feedback: 'Sending encountered an error.' });
                  } else if (response.statusCode == 200) {
                    console.log('Done with send successfully. Mail should have been sent.');
                    this.setState({ feedback: 'Sent!' });
                  } else {
                    console.log('Done with send but server not happy. Mail should not have been sent.');
                    this.setState({ feedback: 'Sending encountered a server error.' });
                  }
                }.bind(this)
               );
      }.bind(this));
  },
  render: function() {
    return (
      <div>
        <label htmlFor='to'>To:</label>
        <input type='text' name='to' id='to' onChange={this.updateTo}></input><br />
        <label htmlFor='kbto'>Keybase ID of Recipient:</label>
        <input type='text' name='kbto' id='kbto' onChange={this.updateKBTo}></input><br />
        <label htmlFor='subject'>Subject:</label>
        <input type='text' name='subject' id='subject' onChange={this.updateSubject}></input><br />
        <textarea name='email' id='email' onChange={this.updateEmail}></textarea><br />
        <button onClick={this.send}> Send </button>
        <span className='error'>{this.state.feedback}</span>
      </div>
    );
  }
});

var EmailClient = React.createClass({
  render: function() {
    return (
      <div>
        <ComposeArea />
        <Inbox />
      </div>
    );
  }
});

ReactDOM.render(<EmailClient />, document.getElementById('app'));
