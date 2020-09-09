$(function() {
/* spotify.js
 * @author(arii)
 * Expands web-api-auth implicit grant example
 * To add ajax web api for play next and pause
 * */

var stateKey = 'spotify_auth_state';

/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
     hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
function generateRandomString(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


var params = getHashParams();

var access_token = params.access_token,
    state = params.state,
    storedState = localStorage.getItem(stateKey);

if (access_token && (state == null || state !== storedState)) {
  alert('There was an error during the authentication');
} else {
  localStorage.removeItem(stateKey);
  if (access_token) {
    $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          $('#login').hide();
          $('#loggedin').show();
            window.history.pushState({}, document.title, "/" + "spotify");
        }

    });
  } else {
      $('#login').show();
      $('#loggedin').hide();
  }
}

$("#Next").click(function(){
$.ajax({
    url: "https://api.spotify.com/v1/me/player/next",
    type: 'POST',
    headers: {
        'Authorization' : 'Bearer ' + access_token
},
    success: function(data) {
     console.log(data);
    },
});
});

$("#Pause").click(function(){
$.ajax({
    url: "https://api.spotify.com/v1/me/player/pause",
    type: 'PUT',
    headers: {
        'Authorization' : 'Bearer ' + access_token
},
    success: function(data) {
     console.log(data);
    },
});

});

$("#login-button").click(function(){
    var client_id = 'e3f3c31112ab4172b1a248e9de99518a'; //TODO load from fs
    var redirect_uri =  window.location.href; 

    var state = generateRandomString(16);

    localStorage.setItem(stateKey, state);
    var scope = 'user-read-private user-read-email user-modify-playback-state ';

    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += '&client_id=' + encodeURIComponent(client_id);
    url += '&scope=' + encodeURIComponent(scope);
    url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    url += '&state=' + encodeURIComponent(state);

    window.location = url;
  });
});

