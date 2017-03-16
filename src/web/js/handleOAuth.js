'use strict';
const GoogleOAuth = require('../../googleOAuth');

let tokenObj = GoogleOAuth.web.parseTokenFromUrl(window.location.href);
GoogleOAuth.web.validateToken(tokenObj.access_token).then(function() {
  GoogleOAuth.storeAccessToken(tokenObj);
  window.location.href = '/mail';
}).catch(function(error) {
  console.error(error);
  // window.location.href = '/login';
});
