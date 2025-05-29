var currentTabId = -1;

var topics = {};

var clickCounter = 1;

/*
 * Handle the browser action button.
 * Initialize and toggle in the toolbar.
 */
chrome.browserAction.onClicked.addListener(function(tab) {
	console.log("browserAction: pressed VIEW button to toggle the toolbar");

	chrome.storage.local.get("topics", function (res) {
        topics = res.topics || {};

        currentTabId = tab.id;

        if(clickCounter === 1){
            // the VIEW icon on the browser was clicked for the first time
            loadTopics(currentTabId);
        }
        else{
            console.log("browserAction: topics loaded from storage!");
            chrome.tabs.sendMessage(currentTabId, {
                msg: "toggle toolbar"
            });
        }
        clickCounter++;
    });
});

/*
 * The topics are being loaded and stored for the first time.
 */
function loadTopics(tabId){
    console.log("loadTopics: topics aren't loaded yet!");

    topics.en = {};

    topics.en.articles = {};

    topics.en.articles.url = chrome.extension.getURL("topics/en/articles.json");

    topics.en.determiners = {};

    topics.en.determiners.url = chrome.extension.getURL("topics/en/determiners.json");

    topics.de = {};

    topics.de.determiners = {};

    topics.de.determiners.url = chrome.extension.getURL("topics/de/determiners.json");

    $.when(
        $.getJSON(topics.en.articles.url, function(data) {
            topics.en.articles.activities = data.activities;
        }),
        $.getJSON(topics.en.determiners.url, function(data) {
            topics.en.determiners.activities = data.activities;
        }),
        $.getJSON(topics.de.determiners.url, function(data) {
            topics.de.determiners.activities = data.activities;
        })
    ).then(function() {
        if (
        topics.en.articles.activities &&
        topics.en.determiners.activities &&
        topics.de.determiners.activities) {
            // store the topics
            chrome.storage.local.set({
                topics: {
                    en: {
                        articles: topics.en.articles,
                        determiners: topics.en.determiners
                    },
                    de: {
                        determiners: topics.de.determiners
                    }
                }
            }, function(){
                // afterwards show the toolbar
                console.log("loadTopics: topics loaded!");
                chrome.tabs.sendMessage(tabId, {
                    msg: "toggle toolbar"
                });
            });
        }
        else {
            chrome.notifications.create("topics-not-loaded-notification", {
                "type": "basic",
                "title": "Topics not loaded!",
                "message": "There was a problem while loading the topics!"
            });
        }
    });
}

/*
 * The toolbar ui send the message to toggle the toolbar.
 * Pass it on to interaction.js.
 */
function toggleToolbar(request) {
	console.log("toggleToolbar: received '" + request.msg + "'");
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "toggle toolbar"
    });
}

/*
 * The toolbar ui send the message to toggle the menu VIEW.
 * Pass it on to interaction.js.
 */
function callToggleMenuVIEW(request) {
	console.log("callToggleMenuVIEW: received '" + request.msg + "'");
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "toggle Menu VIEW"
    });
}

/*
 * The toolbar ui send the message to call initUserOptions().
 * Pass it on to view.js.
 */
function callInitUserOptions(request) {	
	console.log("callInitUserOptions: received '" + request.msg + "'");	
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "call initUserOptions"
    });
}

/*
 * The toolbar ui send the message to call abort().
 * Pass it on to interaction.js.
 */
function callAbort(request) {
	console.log("callAbort: received '" + request.msg + "'");
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "call abort"
    });
}

/*
 * The toolbar ui send the message to call restoreToOriginal().
 * Pass it on to interaction.js.
 */
function callRestoreToOriginal(request) {
	console.log("callRestoreToOriginal: received '" + request.msg + "'");
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "call restore to original"
    });
}

/*
 * Redirects to the given link in the request.
 */
function redirect(request) {
	console.log("redirect: received '" + request.msg + "'");		
	chrome.tabs.create({
        url: request.link
    });
}

/*
 * The toolbar ui send the message to open the options page.
 */
function openOptionsPage(request) {
	console.log("openOptionsPage: received '" + request.msg + "'");		
	chrome.runtime.openOptionsPage();
}

/*
 * The toolbar ui send the message to open the help page.
 */
function openHelpPage(request) {
	console.log("openHelpPage: received '" + request.msg + "'");		
	chrome.storage.local.get("serverURL", function (res) {
    	var url = res.serverURL + "/index.jsp?content=activities";  
    	chrome.tabs.create({
	        url: url
	    });
	}); 
}

/*
 * The toolbar ui send the message to open the about dialog.
 * Pass it on to about.js.
 */
function openAboutDialog(request) {
	console.log("openAboutDialog: received '" + request.msg + "'");	
	chrome.tabs.sendMessage(currentTabId, {
    	msg: "open about dialog"
    });
}

/*
 * Helper function for ajax post calls.
 */
function ajaxPost(url, data, ajaxTimeout){
	//console.log("data: " + JSON.stringify(data));
	return $.post({
		url: url,
		data: JSON.stringify(data), // old: wertiview.nativeJSON.encode(requestData),
		dataType: "text",
		processData: false,
		timeout: ajaxTimeout
	})
	.done(function(data, textStatus, xhr) { // default
		//console.log("data: " + JSON.stringify(data));
		console.log("textStatus: " + JSON.stringify(textStatus));
		var xhrInfo = {
				readyState: xhr.readyState,
				status: xhr.status,
				statusText: xhr.statusText
		};
		console.log("xhrInfo: " + JSON.stringify(xhrInfo));
	})
	.fail(doNothing); // default
}

/*
 * Send the activity data from interaction.js to the
 * server for processing.
 * If successful, request a call of addServerMarkup 
 * in interaction.js.
 */
function sendActivityData(request) {
	console.log("sendActivityData: received '" + request.msg + "'");	
	var ajaxTimeout = request.ajaxTimeout || 120000;
	ajaxPost(request.servletURL, 
			request.activityData, 
			ajaxTimeout)
	.done(function(data, textStatus, xhr) { 
		if (data) {
			// send a request to the interaction.js in the current interaction tab
			console.log("sendActivityData: request 'call addServerMarkup'");
		    chrome.tabs.sendMessage(currentTabId, {
		    	msg: "call addServerMarkup",
		    	data: data
		    });
		} else {
			ajaxError(xhr, "nodata");
		}
	})
	.fail(ajaxError);	
}

/*
 * Send the interaction data from interaction.js to the
 * server for processing.
 */
function sendInteractionData(request) {
	console.log("sendInteractionData: received '" + request.msg + "'");	
	//console.log("sendInteractionData: interactionData "+ JSON.stringify(request.interactionData));
	ajaxPost(request.servletURL, 
			request.interactionData, 
			10000);
}	

/*
 * Send the request data from interaction.js to the
 * server for processing.
 * If successful, request a call of saveDataAndInsertSpans 
 * in interaction.js.
 */
function sendRequestDataAbort(request) {
	console.log("sendRequestDataAbort: received '" + request.msg + "'");		
	var ajaxTimeout = request.ajaxTimeout || 120000;
	ajaxPost(request.servletURL, 
			request.requestData, 
			ajaxTimeout)
	.done(function(data, textStatus, xhr) { 
		// send a request to the interaction.js in the current interaction tab
		console.log("sendRequestDataAbort: request 'call abortEnhancement'");
	    chrome.tabs.sendMessage(currentTabId, {
	    	msg: "call abortEnhancement"
	    });
	});
}

/*
 * Interaction.js send the message to show/hide an element
 * using a selector. Pass it on to toolbar.js.
 */
function showHideElement(request) {	
	chrome.tabs.sendMessage(currentTabId, {
	    msg: request.msg,
	    selector: request.selector
	});
}

/*
 * toolbar.js is ready to receive the topics. Send them to toolbar.js.
 */
function sendTopics(sendResponse) {
	sendResponse({
	    topics: topics
	});
}

/*
 * Processes all messages received from interaction.js and toolbar.js.
 * Sends requests to interaction.js, toolbar.js or the server depending on the message.
 */
function processMessage(request, sender, sendResponse) {
	currentTabId = sender.tab.id;
	
	switch(request.msg) {
		case "toggle toolbar":
			toggleToolbar(request);
	        break; 
	    case "toggle Menu VIEW":
	    	callToggleMenuVIEW(request);
	        break; 
	    case "call initUserOptions":
	    	callInitUserOptions(request);
	        break; 
	    case "call abort":
	    	callAbort(request);
	        break; 
	    case "call restore to original":
	    	callRestoreToOriginal(request);
	        break; 
	    case "redirect to link":
	    	redirect(request);
	        break;
	    case "open options page":
	    	openOptionsPage(request);
	        break;
	    case "open help page":
	    	openHelpPage(request);
	        break;
	    case "open about dialog":
	    	openAboutDialog(request);
	        break;
	    case "send requestData enhance":
	    	sendRequestDataEnhance(request);
	        break;
	    case "send activityData":
	    	sendActivityData(request);
	        break;
	    case "send interactionData":
	    	sendInteractionData(request);
	        break;
	    case "send requestData abort":
	    	sendRequestDataAbort(request);
	        break;
	    case "show element":
	    case "hide element":
	    	showHideElement(request);
	    	break;
	    case "call sendTopics":
	        sendTopics(sendResponse);
	}
}

chrome.runtime.onMessage.addListener(processMessage);	

/*
 * Observe the user id cookie when it changes.
 */
function observeUserId(changeInfo){
	// we are only interested in the view user id cookie changes
	if(changeInfo.cookie.name == "wertiview_userid"){
		console.log('Cookie changed: ' +
				'\n * Cookie: ' + JSON.stringify(changeInfo.cookie) +
				'\n * Cause: ' + changeInfo.cause +
				'\n * Removed: ' + changeInfo.removed);
		if(changeInfo.removed){ // cookie was removed, user logged out
			// send a request to the interaction.js in the current interaction tab
		    chrome.storage.local.set({
		    	userEmail: "",
		    	userid: ""
		    });
		    
			console.log("observeUserId: request 'call signOutUser'");
		    chrome.tabs.sendMessage(currentTabId, {
		    	msg: "call signOut"
		    });
		}
		else{// the user logged in			 
			// send a request to the interaction.js in the current interaction tab
			var account = changeInfo.cookie.value.split("/");
			var userEmail = account[1];
			var userid = account[2];
			
			chrome.storage.local.set({
				userEmail: userEmail,
		    	userid: userid
		    });	
			
			console.log("observeUserId: request 'call signInUser'");
		    chrome.tabs.sendMessage(currentTabId, {
		    	msg: "call signIn",
		    	userEmail: userEmail
		    });
		}		
	}
}

//assign observeUserId() as a listener for the userid cookie
chrome.cookies.onChanged.addListener(observeUserId);

/*
 * This function is supposed to do nothing
 */
function doNothing(){
	// intentionally empty here
}

/*
 * Fire an ajaxError if anything went wrong when sending data 
 * from the extension to the server.
 */
function ajaxError(xhr, textStatus, errorThrown) {
	console.log("ajaxError: calling ajaxError(xhr, textStatus, errorThrown)");	
	console.log("xhr: " + JSON.stringify(xhr));
	console.log("textStatus: " + JSON.stringify(textStatus));
	console.log("errorThrown: " + JSON.stringify(errorThrown));
	// send a request to the interaction.js in the current interaction tab
	console.log("ajaxError: request 'call initalInteractionState'");
    chrome.tabs.sendMessage(currentTabId, {
    	msg: "call initalInteractionState"
    });

	if (!xhr || !textStatus) {
		console.log("(!xhr || !textStatus): The VIEW server encountered an error.");
		chrome.notifications.create("no-xhr-or-textstatus-notification", {
		    "type": "basic",
		    "title": "(!xhr || !textStatus)!",
		    "message": "The VIEW server encountered an error."
		});
		return;
	}

	switch(textStatus) {
		case "nodata":
			console.log("nodata: The VIEW server is currently unavailable.");
			chrome.notifications.create("nodata-notification", {
			    "type": "basic",
			    "title": "No data!",
			    "message": "The VIEW server is taking too long to respond."
			});
			break;
		case "timeout":
			console.log("timeout: The VIEW server is taking too long to respond.");
			chrome.notifications.create("timeout-notification", {
			    "type": "basic",
			    "title": "Timeout!",
			    "message": "The VIEW server is currently unavailable."
			});
			// when the add-on has timed out, tell the server to stop
			//wertiview.activity.abort(); TODO
			break;
		case "error":
			switch (xhr.status) {
				case 490:
					console.log("error 490: The VIEW server no longer supports this version of " +
							"the VIEW extension.\nPlease check for a new version of the add-on" +
							" in the Tools->Add-ons menu!");
					chrome.notifications.create("error-490-notification", {
					    "type": "basic",
					    "title": "Error 490!",
					    "message": "The VIEW server no longer supports this version of the VIEW " +
					    		"extension.\nPlease check for a new version of the add-on in the " +
					    		"Tools->Add-ons menu!"
					});
					break;
				case 491:
					console.log("error 491: The topic selected isn't available.\nPlease select a " +
							"different topic from the toolbar menu.");
					chrome.notifications.create("error-491-notification", {
					    "type": "basic",
					    "title": "Error 491!",
					    "message": "The topic selected isn't available.\nPlease select a " +
					    		"different topic from the toolbar menu."
					});
					break;
				case 492:
					console.log("error 492: The topic selected isn't available for the language " +
							"selected.\nPlease select a different language or topic from the " +
							"toolbar menu.");
					chrome.notifications.create("error-492-notification", {
					    "type": "basic",
					    "title": "Error 492!",
					    "message": "The topic selected isn't available for the language " +
					    		"selected.\nPlease select a different language or topic from " +
					    		"the toolbar menu."
					});
					break;
				case 493:
					console.log("error 493: The server is too busy right now. Please try " +
							"again in a few minutes.");
					chrome.notifications.create("error-493-notification", {
					    "type": "basic",
					    "title": "Error 493!",
					    "message": "The server is too busy right now. Please try again " +
					    		"in a few minutes."
					});
					break;
				case 494:
					// enhancement was stopped on client's request
					break;
				default:
					console.log("error default: The VIEW server encountered an error.");
					chrome.notifications.create("error-default-notification", {
					    "type": "basic",
					    "title": "Error default!",
					    "message": "The VIEW server encountered an error."
					});
					break;
			}
			break;
		default:
			console.log("default: The VIEW server encountered an error.");
			chrome.notifications.create("default-notification", {
			    "type": "basic",
			    "title": "Error default!",
			    "message": "The VIEW server encountered an error."
			});
			break;
	}
}