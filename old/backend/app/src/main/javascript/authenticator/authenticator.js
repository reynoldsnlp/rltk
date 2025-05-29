const $ = require('jquery');
const util = require('./util');
const cookies = require('./cookies');
const firebase = require('firebase');
firebase.initializeApp(viewFirebaseConfig);
const startFirebaseUi = require('./firebase-ui-config');

const view = Object.assign(util, cookies);

let actionParam;

function main() {

    // check if cookies are enabled
    const divCookiesOn = document.getElementById("if-cookies-enabled");
    const divCookiesOff = document.getElementById("if-cookies-disabled");

    if (view.cookies.areCookiesEnabled(document, view.cookie_path)) {
        divCookiesOn.style.display = "block";
        divCookiesOff.style.display = "none";
    }
    else {
        divCookiesOn.style.display = "none";
        divCookiesOff.style.display = "block";
        const span = document.getElementById("server-url");
        span.innerHTML = view.serverURL;
    }
}

/**
 * Displays the UI for a signed in user.
 */
function handleSignedInUser(user) {
    if("sign-in" === actionParam){
        $("#user-signed-in").show();
        $("#user-signed-out").hide();
        $("#name").text(user.displayName);
        $("#email").text(user.email);

        const closeWindow = function() {
            // close window after 3 seconds
            window.setTimeout(function(){window.close();}, 3000);
        };
        user.getToken(true)
            .then(function(idToken) {
                let account = {
                    user: {
                        name: user.displayName,
                        email: user.email,
                        uid: user.uid,
                        token: idToken
                    },
                    firebase: viewFirebaseConfig
                };

              view.cookies.setCookie(document, view.cookie_name, JSON.stringify(account), 10, view.cookie_path);
                const $photo = $("#photo");
                if (user.photoURL){
                    $photo.attr("src", user.photoURL);
                    $photo.show();
                } else {
                    $photo.hide();
                }
                closeWindow();
            })
            .catch(function(error) {
                console.log("Couldn't get token: ", error);
                $("body").html("Couldn't authenticate you! Sorry :-(");
                closeWindow();
            });
    }
}


/**
 * Displays the UI for a signed out user.
 */
function handleSignedOutUser() {
    $("#user-signed-in").hide();
    $("#user-signed-out").show();
    $("#firebaseui-auth-container").hide();
}

/*
 * Listen to change in auth state so it displays the correct UI for when
 * the user is signed in or not.
 */
firebase.auth().onAuthStateChanged(function(user) {
    user ? handleSignedInUser(user) : handleSignedOutUser();
});


/**
 * Initializes the app.
 */
function initAuthenticator() {
    const paramString = location.search.substring(1);
    const searchParams = new URLSearchParams(paramString);
    actionParam = searchParams.get("action");

    if("sign-in" === actionParam){
        $("#firebaseui-auth-container").show();
    }
    else {// Sign Out window
        const prevUserid = view.cookies.getCookie(document, view.cookie_name);
        if(prevUserid === null){
            view.cookies.setCookie(document, view.cookie_name, "temp/temp@web.de/1234", 10, view.cookie_path);
        }
        view.cookies.deleteCookie(document, view.cookie_name, view.cookie_path);

        firebase.auth().signOut().then(function() {
            // Sign-out successful.
            window.close();
        }, function(error) {
            // An error happened.
            console.log(error);
        });
    }
}

$(window).on("load", initAuthenticator);

startFirebaseUi();
