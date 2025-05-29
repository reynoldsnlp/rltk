const firebase = require('firebase');
const firebaseui = require('firebaseui');

var uiConfig = {
    "callbacks": {
        "signInSuccess": function(user, credential, redirectUrl) {
            if (window.opener) {
                // The widget has been opened in a popup.
                return false;
            }
        }
    },
    "signInOptions": [
        // Leave the lines as is for the providers you want to offer your users.
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        firebase.auth.GithubAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    // Terms of service url.
    "tosUrl": "https://view.aleks.bg/extension.html"
};

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

// The start method will wait until the DOM is loaded.
const startFirebase = function() {
    ui.start("#firebaseui-auth-container", uiConfig);
};

module.exports = startFirebase;
