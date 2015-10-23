var React = require('react');
var ReactDOM = require('react-dom');
var request = require('request');
var keybaseAPI = require('./keybaseAPI');
var kbpgp = require('kbpgp');
var p3skb = require('./p3skb');

var ourPublicKeyManager = Promise.reject(new Error('Key manager for local public key not yet created.'));
(function() {
  try { 
    var me = JSON.parse(localStorage.getItem('keybase'))
    var pubkey = me.public_keys.primary.bundle;
    ourPublicKeyManager = keybaseAPI.managerFromPublicKey(pubkey)
  } catch(err) {
    ourPublicKeyManager = Promise.reject(new Error(err));
  }
})();

var Message = React.createClass({
  getInitialState: function() {
    return {
      body: 'NOT YET LOADED'
    }
  },
  componentDidMount: function() {
    var message = getMessageBody(this.props.message);
    keybaseAPI.getPrivateManager()
      .then(keybaseAPI.decrypt(message))
      .then(function(decryptedBody) {
        this.setState({body: decryptedBody});
      }.bind(this))
      .catch(function(err) {
        console.log(err);
        this.setState({body: 'Could not decrypt body: ' + err});
      }.bind(this));
  },

  render: function() {
    var subject = getMessageHeader(this.props.message, 'Subject');
    var from = getMessageHeader(this.props.message, 'From');
    var to = getMessageHeader(this.props.message, 'To');

    return (
      <div className='message'>
        <div className='to'> To: {to} </div>
        <div className='from'> From: {from} </div>
        <div className='subject'> Subject: {subject} </div>
        <div className='body'> {this.state.body} </div>
      </div>
    );
  }
});

var Thread = React.createClass({
  getInitialState: function() {
    return {
      messages: [],
      checked: false,
    }
  },
  render: function() {
    var messages = this.props.thread.messages.map(function(message) {
      return <li key={message.id}> <Message message={message} /> </li>
    });
    var threadSubject = getThreadHeader(this.props.thread, 'Subject');
    var threadFrom = getThreadHeader(this.props.thread, 'From');
    var threadTo = getThreadHeader(this.props.thread, 'To');
    return (
      <div className='emailRow'>
        <input type='checkbox' value={this.state.checked} onchange={this.handleChange}></input>
        <span> {messages.length} messages. </span>
        <span className='to'> To: {threadTo} </span>
        <span className='from'> From: {threadFrom} </span>
        <span className='subject'> Subject: {threadSubject} </span>
        <ul>
        {messages}
        </ul>
      </div>
    );
  }
});
                            
var Inbox = React.createClass({
  getInitialState: function() {
    return {
      threads: [ ],
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
          this.setState({threads: body});
        }
      }.bind(this));
  },

  componentDidMount: function() {
    this.loadMail();
    setInterval(this.loadMail, 5000);
  },

  render: function() {
    var threads = this.state.threads.map(function(thread) {
      return <li key={thread.id}> <Thread thread={thread}/> </li>
    });
    if (threads.length == 0) {
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
          {threads}
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
  encryptEmail: function(keyManagers) {
    return new Promise(function(fulfill, reject) {
      var params = {
        msg: this.state.email,
        encrypt_for: keyManagers,
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
    var toManager = keybaseAPI.publicKeyForUser(this.state.KBto)
      .then(keybaseAPI.managerFromPublicKey);

    Promise.all([toManager, ourPublicKeyManager])
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
      }.bind(this))
      .catch(function(err) {
        console.log(err);
        this.setState({ feedback: err.toString() });
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

function getMessageHeader(message, header) {
  var headers = message.payload.headers;
  for (var i=0; i<headers.length; i++) {
    var h = headers[i];
    if (h.name === header) {
      return h.value;
    }
  }
  return '<<NO MESSAGE HEADER ' + header + 'FOUND>>';

}
function getThreadHeader(thread, header) {
  var headers = thread.messages[0].payload.headers;
  for (var i=0; i<headers.length; i++) {
    var h = headers[i];
    if (h.name === header) {
      return h.value;
    }
  }
  return '<<NO THREAD HEADER ' + header + 'FOUND>>';
}

function getMessageBody(message) {
  if (message.payload.mimeType == 'text/plain') {
    return new Buffer(message.payload.body.data, 'base64').toString();
  } else if (message.payload.mimeType = 'multipart/alternative') {
    // For multipart messages, we need to find the plaintext part.
    var messagePart = message.payload.parts.find(function(messagePart) {
      return messagePart.mimeType == 'text/plain';
    });
    if (messagePart !== undefined) {
      return new Buffer(messagePart.body.data, 'base64').toString();
    }
  }
  return '<<NO MESSAGE BODY>>';
}

ReactDOM.render(<EmailClient />, document.getElementById('app'));
