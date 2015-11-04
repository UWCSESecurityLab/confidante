'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var EmailClient = require('./components/EmailClient.react');
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

ReactDOM.render(<EmailClient />, document.getElementById('app'));
