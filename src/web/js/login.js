var submit = document.getElementById('submit');
submit.onclick = function() {
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var keybase = new KeybaseAPI(username, password, window.location.origin);

  keybase.login().then(function(response) {
    console.log(response.me);
    if (response.status.code != 0) {
      addError(response.status.name);
      return;
    }
    localStorage.setItem('keybase', JSON.stringify(response.me));
    localStorage.setItem('keybasePassphrase', password);
    window.location.href = '/auth/google';
  });
}


function addError(message) {
  var error = document.createTextNode(message);
  var div = document.getElementById('error');
  div.appendChild(error);
}
