var submit = document.getElementById('submit');
submit.onclick = login;

var spinner = document.getElementById('spinner');
spinner.style.display = 'none';

// Submit on enter key
document.onkeydown = function(event) {
  if (event.keyCode == 13) {
    login();
  }
};

function login() {
  removeError();
  spinner.style.display = 'inline';

  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var keybase = new KeybaseAPI(username, password, window.location.origin);

  keybase.login().then(function(response) {
    if (response.status.code != 0) {
      spinner.style.display = 'none';
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
  error.style.visibility = 'visible';
}

function removeError() {
  var error = document.getElementById('error');
  error.style.visibility = 'hidden';
}
