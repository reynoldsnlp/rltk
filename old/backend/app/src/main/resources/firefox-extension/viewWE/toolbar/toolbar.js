// the topics JSON object
var topics = {};

/*
 * Initialization of the extension when the browser action button 
 * is clicked and active events.
 */
$(document).ready(function() {
	// The iframe was loaded, request the topics JSON object
	console.log("iframe loaded: request 'call sendTopics()'");
    chrome.runtime.sendMessage({
        msg: "call sendTopics"
    }, function(response){
        console.log("received response: got topics JSON object.");

        topics = response.topics;

        // When the user clicks on the button,
        // toggle between hiding and showing the drop down content
        $("#wertiview-VIEW-menu-btn").on("click", function(){
            // send a request to the view.js in the active tab
            chrome.runtime.sendMessage({
                msg: "toggle Menu VIEW"
            });
        });

        // show disabled, hide enabled symbol when enabled symbol was clicked
        $("#wertiview-toolbar-enabled").on("click", function(){
            $("#wertiview-toolbar-enabled").hide();
            $("#wertiview-toolbar-disabled").show();
            // deactivate auto-run (don't enhance on sight)
            chrome.storage.local.set({
                enabled: false
            });
        });

        // show enabled, hide disabled symbol when disabled symbol was clicked
        $("#wertiview-toolbar-disabled").on("click", function(){
            $("#wertiview-toolbar-enabled").show();
            $("#wertiview-toolbar-disabled").hide();
            // activate auto-run (enhance on sight)
            chrome.storage.local.set({
                enabled: true
            });
        });

        // handle the new language selection
        $("#wertiview-toolbar-language-menu").on("change",function() {
            // select the topic menu according to the language
            selectTopicMenu($(this).val());
        });

        // handle the new topic selection
        $(	"#wertiview-toolbar-topic-menu-unselected, " +
            "#wertiview-toolbar-topic-menu-en, " +
            "#wertiview-toolbar-topic-menu-de, " +
            "#wertiview-toolbar-topic-menu-es, " +
            "#wertiview-toolbar-topic-menu-ru").on("change",function() {
            var language = $("#wertiview-toolbar-language-menu").val();
            var topic = $(this).val();
            // update activities for topic selection
            updateActivities(language, topic);
        });

        // show run button and hide restore, abort buttons and loading image
        $("#wertiview-toolbar-enhance-button").show();
        $("#wertiview-toolbar-restore-button").hide();
        $("#wertiview-toolbar-abort-button").hide();
        $("#wertiview-toolbar-loading-image").hide();

        // prepare and send the message to enhance the page when "enhance" was clicked
        $("#wertiview-toolbar-enhance-button").on("click",function() {
            // store the selected language, topic and activity
            chrome.storage.local.set({
                language: $("#wertiview-toolbar-language-menu").val(),
                topic: $(".selected-toolbar-topic-menu").val(),
                activity: $("#wertiview-toolbar-activity-menu").val()
            }, function(){ // afterwards initiate the enhancement process
                // disable enhance and restore button, show spinning wheel
                $("#wertiview-toolbar-enhance-button").hide();
                $("#wertiview-toolbar-restore-button").hide();
                $("#wertiview-toolbar-loading-image").show();

                // send a request to view.js
                console.log("click on enhance: request 'call initUserOptions'");
                chrome.runtime.sendMessage({
                    msg: "call initUserOptions"
                });
            });
        });

        // add a click handler for abort
        $("#wertiview-toolbar-abort-button").on("click",function() {
            console.log("click on abort: request 'call abort()'");
            chrome.runtime.sendMessage({
                msg: "call abort"
            });
        });

        // add a click handler for restore
        $("#wertiview-toolbar-restore-button").on("click",function() {
            console.log("click on restore: request 'call restoreToOriginal()'");
            chrome.runtime.sendMessage({
                msg: "call restore to original"
            });
        });

        // add a click handler for the sign in link
        $("#wertiview-toolbar-identity-signinlink").on("click",function() {
            console.log("click on signinlink: open auth popup");
            var authWindow = window.open($(this).attr("link"), "Sign In", "width=985,height=735");
            authWindow.focus();
        });

        // add a click handler for the sign out link
        $("#wertiview-toolbar-identity-signoutlink").on("click",function() {
            console.log("click on signoutlink: open auth popup");
            var authWindow = window.open($(this).attr("link"), "Sign Out", "width=1,height=1");
            authWindow.moveTo(0,window.screen.availHeight+1000);
        });

        // Handle click events on the toolbar button.
        $("#wertiview-toolbar-toggle").on("click",function() {
            console.log("click on toggle: request 'toggle toolbar'");
            // Ask the background page to toggle the toolbar on the current tab
            chrome.runtime.sendMessage({
                msg: "toggle toolbar"
            });
        });

        // restore all selections made for language, topic and activity
        restoreSelections();
    });
});

/*
 * Restores all selections from language, topic and activity.
 * Restore sign-in/sign-out interface.
 * Restore auto-run option (enabled/disabled).
 * The values right to "||" are default values.
 */
function restoreSelections() {
	console.log("restoreSelections()");
	chrome.storage.local.get(["language",
	                          "topic",
	                          "activity",
	                          "serverURL",
	                          "userEmail",
	                          "enabled"], function (res) {
		var language = res.language || "unselected";
		var topic = res.topic || "unselected";
		var activity = res.activity || "unselected";
		var enabled = res.enabled || false;
		
		// restore language menu selection
		$("#wertiview-toolbar-language-" + language).prop("selected", true);			
		
		// restore topic menu selection
		// special case Dets and Preps are shared between en, de and es
		if(topic == "determiners" || topic == "Preps"){ // add "-en|de|es" to selector
			$("#wertiview-toolbar-topic-" + topic + "-"+ language).prop("selected", true);	
		}
		else {
			$("#wertiview-toolbar-topic-" + topic).prop("selected", true);		
		}				
		
		// restore activity menu selection
		$("#wertiview-toolbar-activity-" + activity).prop("selected", true);
		
		// select the topic menu according to the language
		selectTopicMenu(language);
		
		initSignInOutInterfaces(res.serverURL);
		
		var userEmail = res.userEmail;
		
		// verify User Sign In Status
		if(userEmail == ""){
			signOut();
		}
		else {
			signIn(userEmail);
		}
		
		// restore enabled/disabled auto-run selection
		if(enabled){
			$("#wertiview-toolbar-enabled").show();
			$("#wertiview-toolbar-disabled").hide();
			
			// prepare and send the message to enhance the page when auto-run is "enabled" 
			$("#wertiview-toolbar-enhance-button").click();
		}
		else { // disabled
			$("#wertiview-toolbar-enabled").hide();
			$("#wertiview-toolbar-disabled").show();
		}
	});
};

/*
 * Select the topic menu according to the language option.
 */
function selectTopicMenu(lang){
	$("#wertiview-toolbar-language-menu option").each(function() {
		var currentLang = $(this).val();
		var $topicMenu = $("#wertiview-toolbar-topic-menu-" + currentLang);
		if(currentLang == lang){ // show topics appropriate to the language
			$topicMenu.addClass("selected-toolbar-topic-menu").show();
			var topic = $topicMenu.val();
			updateActivities(lang, topic);
		} else { // hide topics from other languages
			$topicMenu.removeClass("selected-toolbar-topic-menu").hide();
		}
	});		
}

/*
 * Update activities when the topic is changed. Enable activities available
 * to the topic and disable the ones that aren't.
 */
function updateActivities(language, topic){

    var activitySelector = {};

    // fill up the activity selector, disable and hide all activities
    $("#wertiview-toolbar-activity-menu option[value]").each(function() {
        var currentActivity = $(this).val();
        activitySelector[currentActivity] = $("#wertiview-toolbar-activity-" + currentActivity);
        activitySelector[currentActivity].prop("disabled", true).hide();
    });

    var unselected = "unselected";

	// activity "Pick an Activity" is always enabled, selected and visible
	activitySelector[unselected].prop("disabled", false).prop("selected", true).show();

    if(
    language == unselected ||
    topic.startsWith(unselected) ||
    typeof topics[language][topic] === "undefined"){
        // hide the horizontal separator
        activitySelector[unselected].next().hide();
    }
	else{
        // show the horizontal separator
        activitySelector[unselected].next().show();

        var availableActivities = topics[language][topic].activities;

        var availableActivitiesLength = availableActivities.length;

        // enable and show only activities that are available for the language and topic combination
        for (var i = 0; i < availableActivitiesLength; i++) {
            activitySelector[availableActivities[i].activity].prop("disabled", false).show();
        }
	}
};

/*
 * Set the href attribute for the identity sign-in/out link.
 */
function initSignInOutInterfaces(serverURL){
	console.log("initSignInOutInterfaces(serverURL)");
	var link = serverURL + "/openid/authenticator.html";
	$("#wertiview-toolbar-identity-signinlink").attr("link", link);
	$("#wertiview-toolbar-identity-signoutlink").attr("link", link);
}

/*
 * Show the sign in link and hide the signed in status, user id and sign out link.
 */
function signOut() {
	console.log("signOut: the user is logged out");
	$("#wertiview-toolbar-identity-signinlink").css("display", "inline");
    $("#wertiview-toolbar-identity-signedinstatus").hide();
    $("#wertiview-toolbar-identity-signedinuserid").hide();
    $("#wertiview-toolbar-identity-signoutlink").hide();
}

/*
 * Hide the sign in link and show the signed in status, user id and sign out link.
 * Fill in the user id.
 */
function signIn(userid){
	console.log("enableSignInInterface: the user is logged in");
	$("#wertiview-toolbar-identity-signinlink").hide();
    $("#wertiview-toolbar-identity-signedinstatus").css("display", "inline");
    $("#wertiview-toolbar-identity-signedinuserid").css("display", "inline");
    $("#wertiview-toolbar-identity-signoutlink").css("display", "inline");
    $("#wertiview-toolbar-identity-signedinuserid").text(userid);
}

/*
 * The extension send the message to sign out the user.
 */
function signOutUser(request) {	
	console.log("signOutUser: received '" + request.msg + "'");
	signOut();
}

/*
 * The extension send the message to sign in the user.
 */
function signInUser(request) {	
	console.log("signInUser: received '" + request.msg + "'");	
	signIn(request.userEmail);
}

/*
 * Processes all messages received from background.js.
 * Sends requests to backround.js or handles requests here.
 */
function processMessageForToolbar(request, sender, sendResponse) {	
	switch(request.msg) {
		case "call signOut":
			signOutUser(request);
	        break; 
	    case "call signIn":
	    	signInUser(request);
	        break; 
	    case "show element":
	    	$(request.selector).show();
	        break; 
	    case "hide element":
	    	$(request.selector).hide();
	}
}

chrome.runtime.onMessage.addListener(processMessageForToolbar);	