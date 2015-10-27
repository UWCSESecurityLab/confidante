var submit = document.getElementById('submit');
submit.onclick = function() {
  removeError();
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var keybase = new KeybaseAPI(username, password, window.location.origin);

  keybase.login().then(function(response) {
    console.log(response.me);
    if (response.status.code != 0) {
      addError();
      return;
    }
    localStorage.setItem('keybase', JSON.stringify(response.me));
    localStorage.setItem('keybasePassphrase', password);
    window.location.href = '/auth/google';
  });
}


function addError() {
  var error = document.getElementById('error');
  error.style.visibility = "visible";
}

function removeError() {
  var error = document.getElementById('error');
  error.style.visibility = "hidden";
}
