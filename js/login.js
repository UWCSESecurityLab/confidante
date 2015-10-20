var submit = document.getElementById('submit');
submit.onclick = function() {
  var req = new XMLHttpRequest();
  req.addEventListener('load', function() {
    console.log(this.responseText);
  })
  req.open('POST', '/auth/keybase');
  req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  req.send(JSON.stringify({
    username: document.getElementById('username').value,
    password: document.getElementById('password').value
  }));
}
