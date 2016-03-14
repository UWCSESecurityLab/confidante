'use strict';

/*eslint-disable no-unused-vars*/
var React = require('react');
var EmailClient = require('./components/EmailClient.react');
/*eslint-enable no-unused-vars*/

var ReactDOM = require('react-dom');

var threadToOpen = window.location.hash.replace('#', '');
ReactDOM.render(<EmailClient threadToOpen={threadToOpen}/>, document.getElementById('app'));
