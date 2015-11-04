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
      body: 'Decrypting...'
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
      <div className="message">
        <div className="messageHeader">
          <strong>{from}</strong>
          <p>To: {to}</p>
        </div>
        <div className="messageBody">
          {this.state.body}
        </div>
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
  close: function() {
    this.props.closeCallback();
  },
  render: function() {
    var messages = this.props.thread.messages.map(function(message) {
      return <li key={message.id}> <Message message={message} /> </li>
    });
    var subject = getThreadHeader(this.props.thread, 'Subject');
    return (
      <div className="row thread">
        <div className="threadHeader">
          <h4 className="subjectLine">{subject}</h4>
          <button type="button" className="close threadClose" onClick={this.close}>&times;</button>
        </div>
        <ul>{messages}</ul>
      </div>
    );
  }
})

/**
 * A thread snippet is a preview of the email, which is displayed in the inbox
 * or other mailboxes. When clicked, it shows the content of the whole thread.
 */
var ThreadSnippet = React.createClass({
  getInitialState: function() {
    return {
      messages: [],
      checked: false,
      fullThread: false,
    }
  },
  openThread: function(event) {
    this.state.fullThread = true;
  },
  closeThread: function(event) {
    this.state.fullThread = false;
  },
  render: function() {
    if (!this.state.fullThread) {
      var threadSubject = getThreadHeader(this.props.thread, 'Subject');
      var threadFrom = getThreadHeader(this.props.thread, 'From');
      var threadTo = getThreadHeader(this.props.thread, 'To');
      return (
        <div className="row snippet" onClick={this.openThread}>
          <div className="col-md-1">
            <input type="checkbox" value={this.state.checked} onchange={this.handleChange}></input>
          </div>
          <div className="col-md-3">
            <strong>{threadFrom}</strong>
          </div>
          <div className="col-md-8">
            {threadSubject}
          </div>
        </div>
      );
    } else {
      return <Thread thread={this.props.thread} closeCallback={this.closeThread}/>
    }
  }
});

var Inbox = React.createClass({
  getInitialState: function() {
    return {
      threads: [],
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
    var snippets = this.state.threads.map(function(thread) {
      return <li key={thread.id}> <ThreadSnippet thread={thread}/> </li>
    });
    if (snippets.length == 0) {
      return (
        <div>
          <h1> {this.state.listname} </h1>
          <div className="row snippet">No encrypted emails!</div>
        </div>
      )
    }
    return (
      <div>
        <h1> {this.state.listname} </h1>
        <ul>
          {snippets}
        </ul>
      </div>
    );
  }
});

var ComposeButton = React.createClass({
  render: function() {
    return (
      <button type="button" className="btn btn-primary" id="composeButton" data-toggle="modal" data-target="#composeMessage">
        Compose Message
      </button>
    )
  }
})

var ComposeArea = React.createClass({
  getInitialState: function() {
    return {
      to: '',
      KBto: '',
      subject: '',
      email: '',
      feedback: '',
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
        request({
            method: 'POST',
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
              $('#composeMessage').modal('hide');
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
      <div className="modal fade" id="composeMessage">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title">Compose Email</h4>
            </div>
            <div className="modal-body">
              <form className="form-horizontal">
                <div className="form-group">
                  <label htmlFor="to">To:</label>
                  <input type="text" name="to" id="to" onChange={this.updateTo} className="form-control"></input><br />
                </div>
                <div className="form-group">
                  <label htmlFor="kbto">Keybase ID of Recipient:</label>
                  <input type="text" name="kbto" id="kbto" onChange={this.updateKBTo} className="form-control"></input><br />
                </div>
                <div className="form-group">
                <label htmlFor="subject">Subject:</label>
                <input type="text" name="subject" id="subject" onChange={this.updateSubject} className="form-control"></input><br />
                </div>
                <div className="form-group">
                  <textarea name="email" id="email" onChange={this.updateEmail} className="form-control"></textarea><br />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button onClick={this.send} className="btn btn-primary">Send</button>
              <span className="error">{this.state.feedback}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

var EmailClient = React.createClass({
  render: function() {
    return (
      <div>
        <ComposeButton />
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
