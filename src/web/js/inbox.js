'use strict';

/*eslint-disable no-unused-vars*/
var React = require('react');
var EmailClient = require('./components/EmailClient.react');
/*eslint-enable no-unused-vars*/

var ReactDOM = require('react-dom');

var linkidToOpen = window.location.hash.replace('#linkid:', '');
ReactDOM.render(<EmailClient linkidToOpen={linkidToOpen}/>, document.getElementById('app'));
