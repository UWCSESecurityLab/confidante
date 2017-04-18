'use strict';

const request = require('request');
const ORIGIN = 'https://confidante.cs.washington.edu';

function getLatestVersion() {
  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      url: `${ORIGIN}/version.json`,
    }, function(error, response, body) {
      if (error) {
        reject(error)
      } else {
        try {
          let versionNumber = JSON.parse(body).version;
          resolve(versionNumber);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

exports.getLatestVersion = getLatestVersion;
