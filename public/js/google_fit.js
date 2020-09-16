/*
 * google_fit.js
 * @author(arii)
 *
 * send heart rate data to google fit
 * get estimated calories burned
 * log in/out of google
 * TODO: everything
 * */

// Set a same-site cookie for first-party contexts
document.cookie = 'SameSite=None';
// Set a cross-site cookie for third-party contexts
//document.cookie = 'cookie2=value2; SameSite=Strict; Secure';
//response.setHeader("Set-Cookie", HttpOnly;Secure;SameSite=Strict");

function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      console.log('User signed out.');
    });
  }


