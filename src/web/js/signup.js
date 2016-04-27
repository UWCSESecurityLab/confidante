'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var SignupClient = require('./components/SignupClient.react');

let serverVars = JSON.parse(document.getElementById('server-vars').innerHTML);

ReactDOM.render(<SignupClient toolname={serverVars.toolname}/>, document.getElementById('app'));
