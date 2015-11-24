'use strict';

var purepack = require('purepack');
var triplesec = require('triplesec');
var pgpUtils = require('pgp-utils').armor;
var crypto = require('crypto');

function checkP3SKBHash(json) {
  // Check the hash
  var given = json.hash.value.toString('hex');
  json.hash.value = new Buffer([]);
  var newbuf = purepack.pack(json, { sort_keys : true });
  var computed = crypto.createHash('SHA256').update(newbuf).digest().toString('hex');
  return given === computed;
}
module.exports.checkP3SKBHash = checkP3SKBHash;

function computeP3SKBHash(obj) {
  obj.hash.body = new Buffer(0);
  var packed = purepack.pack(obj, { sort_keys : true });
  var computed = crypto.createHash('SHA256').update(packed).digest().toString('hex');
  return computed;
}
module.exports.computeP3SKBHash = computeP3SKBHash;

function p3skbToArmoredPrivateKey(p3skb, passphrase) {
  return new Promise(function(fulfill, reject) {
    var decoded = new Buffer(p3skb, 'base64');
    var p3skbJSON = purepack.unpack(decoded);
    if (!checkP3SKBHash(p3skbJSON)) {
      reject('P3SKB hash did not match.');
      return;
    }
    triplesec.decrypt({
      data: p3skbJSON.body.priv.data,
      key: new Buffer(passphrase, 'utf8')
    }, function(err, keyPlaintext) {
      if (err) {
        reject(err);
      } else {
        var armored = pgpUtils.encode({
          header: {
            comment: 'none',
            version: '0'
          }
        }, 'PRIVATE KEY BLOCK', keyPlaintext);
        fulfill(armored);
      }

    });
  });
}
module.exports.p3skbToArmoredPrivateKey = p3skbToArmoredPrivateKey;

function armoredPrivateKeyToP3skb(armoredKey, passphrase) {
  return new Promise(function(fulfill, reject) {
    var unarmored = pgpUtils.decode(armoredKey);
    // console.log('unarmored! ' + unarmored.length);
    // console.log(unarmored);
    // console.log('unarmored! end');
    // var payloadJoined = unarmored[1].payload.replace(/(\r\n|\n|\r)/gm,"");
    // var bodySame = unarmored[1].body.toString('base64') === payloadJoined;

    // console.log('body is same? ' + bodySame); // TRUE
    //
    triplesec.encrypt({
      data: unarmored[1].body,
      key: new Buffer(passphrase, 'utf8')
    }, function(err, keyCiphertext) {
      if (err) {
        reject(err);
        return;
      }
      var p3skbObj = {
        body: {
          pub: new Buffer(0), // UNIMPLEMENTED.
          priv: {
            data: keyCiphertext,
            encryption: 3
          }
        },
        hash: {
          value: new Buffer(0),
          type: 8
        },
        tag: 513,
        version: 1
      };
      p3skbObj.hash.value = computeP3SKBHash(p3skbObj);
      var packed = purepack.pack(p3skbObj, { sort_keys: true });
      var base64ed = packed.toString('base64');
      fulfill(base64ed);
    });
  });
}
module.exports.armoredPrivateKeyToP3skb = armoredPrivateKeyToP3skb;
