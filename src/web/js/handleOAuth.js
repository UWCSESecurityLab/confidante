'use strict';
const GoogleOAuth = require('../../googleOAuth');

let tokenObj = GoogleOAuth.web.parseTokenFromUrl(window.location.href);
GoogleOAuth.web.validateToken(tokenObj.access_token).then(function() {
  let tokenTime = GoogleOAuth.addTokenExpireTime(tokenObj);
  GoogleOAuth.web.storeAccessToken(tokenTime);
  window.location.href = '/mail';
}).catch(function(error) {
  console.error(error);
  // TODO: Show error? Handle more gracefully?
  window.location.href = '/login';
});
