//$(function() {
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
var spotify_current = null;

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
          $('.loggedin').show();
            window.history.pushState({}, document.title, "/" );
        }

    });
  } else {
      $('#login').show();
    //  $('#loggedin').hide();
  }
}

/*moved to server_client_clicks
 * $("#Next").click(function(){
    spotify_next()
});

$("#Pause").click(function(){
    spotify_pause()
});
*/

const $valueSpan = $('.valueSpan');
const $value = $('#slider11');
  $valueSpan.html($value.val());
  $value.on('input change', () => {

    $valueSpan.html($value.val());
      do_spotify_volume($value.val());
  });

// renamed from spotify_next
function do_spotify_next(){
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
}

//bring back play
function do_spotify_play(){
$.ajax({
    url: "https://api.spotify.com/v1/me/player/play",
    type: 'PUT',
    headers: {
        'Authorization' : 'Bearer ' + access_token
},
    success: function(data) {
     console.log(data);
    },
});
}


//renamed from spotify_pause
function do_spotify_pause(){
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
}

//renamed from spotify_pause
function do_spotify_volume(volume_percent){
 url_= "https://api.spotify.com/v1/me/player/volume?volume_percent=";
 url_+=volume_percent;

$.ajax({
    url: url_,
    type: 'PUT',
    headers: {
        'Authorization' : 'Bearer ' + access_token
},
    success: function(data) {
     console.log(data);
    },
});
}

//renamed from spotify_pause
function do_spotify_current(){
url =  "https://api.spotify.com/v1/me/player/currently-playing";

$.ajax({
    url: url,
    type: 'GET',
    headers: {
        'Authorization' : 'Bearer ' + access_token
},
    success: function(data) {
     console.log(data);
        spotify_current = data;
        update_spotify_current(data);
    },
});
}


function update_spotify_current(spotify_current){
    if ( typeof(spotify_current) === "undefined" || spotify_current == null)
        return;

    artist = spotify_current.item.artists[0].name;
    title =  spotify_current.item.name;
    $("#spotify_title").text(title);
    $("#spotify_artist").text(artist);


    console.log("artist" + artist + " title " + title);
}

$("#vol50").click(function(){
    do_spotify_volume(50);
});
$("#vol0").click(function(){
    do_spotify_volume(0);
});
$("#vol100").click(function(){
    do_spotify_volume(100);
});


$("#login-button").click(function(){
    var client_id = 'e3f3c31112ab4172b1a248e9de99518a'; //TODO load from fs
    var redirect_uri =  window.location.href; 

    var state = generateRandomString(16);

    localStorage.setItem(stateKey, state);
    var scope = 'user-read-private user-read-currently-playing user-read-playback-state user-read-email user-modify-playback-state ';

    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += '&client_id=' + encodeURIComponent(client_id);
    url += '&scope=' + encodeURIComponent(scope);
    url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    url += '&state=' + encodeURIComponent(state);

    window.location = url;
  });
//});

