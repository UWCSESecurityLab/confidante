var React = require('react');
var ReactDOM = require('react-dom');
var request = require('request');

// var HelloWorld = React.createClass({
//   render: function(){
//     return (
//       <div>
//         Hello World!
//       </div>
//     )
//   }
// });

// var HelloUser = React.createClass({
//   getInitialState: function(){
//     return {
//       username: 'It is me, a Mario.'
//     }
//   },
//   handleChange: function(e){
//     this.setState({
//       username: e.target.value
//     });
//   },
//   render: function(){
//     return (
//       <div>
//         Hello {this.state.username} <br />
//         Change Name: <input type="text" value={this.state.username} onChange={this.handleChange} />
        
//       </div>
//     )
//   }
// });
// var FriendsContainer = React.createClass({
//   getInitialState: function(){
//     return {
//       name: 'Tyler McGinnis',
//       friends: ['Jake Lingwall', 'Murphy Randall', 'Merrick Christensen']
//     }
//   },
//   render: function(){
//     return (
//       <div>
//         <h3> Name: {this.state.name} </h3>
//         <ShowList names={this.state.friends} />
//       </div>
//     )
//   }
// });
// var ShowList = React.createClass({
//   render: function(){
//     var listItems = this.props.names.map(function(friend){
//       return <li> {friend} </li>;
//     });
//     console.log(listItems);
//     return (
//       <div>
//         <h3> Friends </h3>
//         <ul>
//           {listItems}
//         </ul>
//       </div>
//     )
//   }
// });

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

var EmailList = React.createClass({
  getInitialState: function() {
    return {
      emails: this.props.emails
    }
  },

  componentDidMount: function() {
    this.loadMail();
    setInterval(this.loadMail, 5000);
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

  addEmail: function(email) {
    this.setState({
      emails: this.state.emails.concat([email])
    });
  },
  render: function() {
    var emails = this.state.emails.map(function(email) {
      return <li key={email.id}> <Email sender={email.sender} subject={email.subject} /> </li>
    });
    if (emails.length == 0) {
      return (
        <div>
          <h3> {this.props.listname} </h3>
          No email!
        </div>
      )
    }
    return (
      <div>
        <h3> {this.props.listname} </h3>
        <ul>
          {emails}
        </ul>
      </div>
    );
  }
});

var AddEmail = React.createClass({
  addEmail: function(e) {
    this.props.addEmailHandler({sender: 'NEW', subject: 'NEW SUBJECT', id: 100});
  },
  render: function() {
    return <button onClick={this.addEmail}> Add Email </button>
  }
});

var Inbox = React.createClass({
  getInitialState: function() {
    return {
      emails: [ ],
      listname: 'Inbox',
    }
  },
  render: function() {
    return (
      <div>
        <EmailList listname={this.state.listname} emails={this.state.emails} />
      </div>
    );
  }
});

// ReactDOM.render(<HelloWorld />, document.getElementById('app'));
ReactDOM.render(<Inbox />, document.getElementById('app'));
// ReactDOM.render(<HelloUser />, document.getElementById('app2'));
// React
