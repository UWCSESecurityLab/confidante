var submit = document.getElementById('submit');
submit.onclick = function() {
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var keybase = new KeybaseAPI(username, password, window.location.origin);

  keybase.login().then(function(response) {
    console.log(response);
  })
}
