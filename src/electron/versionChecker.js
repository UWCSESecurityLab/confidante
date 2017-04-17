'use strict';

const xhr = require('xhr');
const request = require('request');
const ORIGIN = 'http://localhost:3000';
console.log(`ORIGIN: ${ORIGIN}`);

function getLatestVersion() {
  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      url: `${ORIGIN}/version.json`,
    }, function(error, response, body) {
      if (error) {
        reject(error)
      } else {
        let versionNumber = JSON.parse(body).version;
        resolve(versionNumber);
      }
    });
  });
}

exports.getLatestVersion = getLatestVersion;
