var React = require('react');
var ReactDOM = require('react-dom');
var request = require('request');

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
        <span className='sender'> {this.props.sender} </span>
        <span className='subject'> {this.props.subject} </span>
      </div>
    );
  }
});

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
        url: 'http://localhost:3000/fakeInbox' 
      }, 
      function(error, response, body) {
        if (!error) {
          body = JSON.parse(body);
          this.setState(body);
        }
      }.bind(this));
  },

  componentDidMount: function() {
    this.loadMail();
    setInterval(this.loadMail, 5000);
  },

  render: function() {
    var emails = this.state.emails.map(function(email) {
      return <li key={email.id}> <Email sender={email.sender} subject={email.subject} /> </li>
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
      subject: '',
      body: ''
    }
  },
  updateTo: function(e) {
    this.setState({
      to: e.target.value
    });
  },
  updateSubject: function(e) {
    this.setState({
      subject: e.target.value
    });
  },
  updateBody: function(e) {
    this.setState({
      body: e.target.value
    });
  },
  send: function(e) {
    console.log('unimplemented!');
    console.log(this.state);
  },
  render: function() {
    return(
      <div>
        <label htmlFor='to'>To:</label>
        <input type='text' name='to' id='to' onChange={this.updateTo}></input><br />
        <label htmlFor='subject'>Subject:</label>
        <input type='text' name='subject' id='subject' onChange={this.updateSubject}></input><br />
        <textarea name='body' id='body' onChange={this.updateBody}></textarea><br />
        <button onClick={this.send}> Send </button>
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

// ReactDOM.render(<HelloWorld />, document.getElementById('app'));
ReactDOM.render(<EmailClient />, document.getElementById('app'));
// ReactDOM.render(<HelloUser />, document.getElementById('app2'));
// React
