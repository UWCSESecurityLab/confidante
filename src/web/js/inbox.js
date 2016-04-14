'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var EmailClient = require('./components/EmailClient.react');

let linkidToOpen = window.location.hash.replace('#linkid:', '');
let serverVars = JSON.parse(document.getElementById('server-vars').innerHTML);

ReactDOM.render(<EmailClient linkidToOpen={linkidToOpen}
                             serverVars={serverVars}/>,
                document.getElementById('app'));
