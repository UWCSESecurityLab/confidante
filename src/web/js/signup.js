'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const SignupClient = require('./components/SignupClient.react');

let serverVars = JSON.parse(document.getElementById('server-vars').innerHTML);

ReactDOM.render(<SignupClient toolname={serverVars.toolname}/>, document.getElementById('app'));
