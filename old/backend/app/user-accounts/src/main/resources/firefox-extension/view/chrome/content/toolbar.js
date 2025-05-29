wertiview.ns(function() {
	wertiview.toolbar = {
	initialize: function() {
		var prefservice = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		var prefs = prefservice.getBranch("extensions.wertiview.");

		// restore enabled button
		var wertiviewToolbarButton = document.getElementById("wertiview-toolbar-enabled");

		if (prefs.getBoolPref("enabled") == true) {
			//enabledCheckbox.setAttribute("checked", true);
			wertiviewToolbarButton.setAttribute("wertiview-state", "enabled");
		} else {
			//enabledCheckbox.setAttribute("checked", false);
			wertiviewToolbarButton.setAttribute("wertiview-state", "disabled");
		}
		
		// restore language menu
		var lang = prefs.getCharPref("language");
		var languageToolbarMenu = document.getElementById("wertiview-toolbar-language-menu");
		var selectedLanguageElement = document.getElementById("wertiview-toolbar-language-" + lang);
		languageToolbarMenu.selectedItem = selectedLanguageElement;

		// restore topic menu
		var topicToolbarMenu = document.getElementById("wertiview-toolbar-topic-menu");
		var selectedTopicElement = document.getElementById("wertiview-toolbar-topic-" + prefs.getCharPref("topic"));
		topicToolbarMenu.selectedItem = selectedTopicElement;

		// restore activity menu
		var activityToolbarMenu = document.getElementById("wertiview-toolbar-activity-menu");
		var selectedActivityElement = document.getElementById("wertiview-toolbar-activity-" + prefs.getCharPref("activity"));
		activityToolbarMenu.selectedItem = selectedActivityElement;
		
		// disable restore button by default
		wertiview.toolbar.enableRunButton();
		wertiview.toolbar.disableRestoreButton();
		wertiview.toolbar.disableAbortButton();
		wertiview.toolbar.hideSpinningWheel();
		
		// update topics for language selection
		wertiview.toolbar.updateTopics(lang);

		// set the URLs for the sign in/ sign out links
		wertiview.toolbar.initSignInOutInterfaces();

		// after a browser restart, we can't access the cookie, so we pretend
		// no user is signed in
		// TODO SECURITY ISSUE: when clicking 'sign in' again, no pw required!
		wertiview.setUserid("");

		// monitor changes to the cookie that stores the user's OpenID
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(wertiview.toolbar.CookieObserver, "cookie-changed", false);
	},

	/*
	 * @class This class represents an observer (nsIObserver) for
	 * cookie-changed events. These events are dispatched by Firefox.
	 * See https://developer.mozilla.org/En/Observer_Notifications
	 */
	CookieObserver: {
	    observe: function(subject, topic, data) {
	    	// monitor only cookie changes while we're on a VIEW page
	    	// (otherwise we don't have access to our cookie)
	    	if (window.content.document.URL.indexOf(wertiview.serverURL) != -1) {
		    	var userid = wertiview.cookies.getCookie(window.content.document, wertiview.COOKIE_NAME);
		    	if (userid == null) {
		    		wertiview.toolbar.enableSignInInterface();
		    		wertiview.toolbar.disableSignOutInterface();
		    		wertiview.setUserid("");
		    	} else {
		    		wertiview.toolbar.disableSignInInterface();
		    		wertiview.toolbar.enableSignOutInterface();
		    		wertiview.toolbar.setSignedInAs(userid);
		    		wertiview.setUserid(userid);
		    	}
	    	}
	    }
	},

	toggleEnabled: function() {
		var prefservice = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		var prefs = prefservice.getBranch("extensions.wertiview.");

		var wertiviewToolbarButton = document.getElementById("wertiview-toolbar-enabled");

		if (prefs.getBoolPref("enabled")) {
			prefs.setBoolPref("enabled", false);
			wertiviewToolbarButton.setAttribute("wertiview-state", "disabled");
		} else {
			prefs.setBoolPref("enabled", true);
			wertiviewToolbarButton.setAttribute("wertiview-state", "enabled");
		}
	},

	setSelection: function(pref, event) {
		var prefservice = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		var prefs = prefservice.getBranch("extensions.wertiview.");

		prefs.setCharPref(pref, event.target.value);
	},
	
	updateTopics: function(lang) {		
		// TODO: get this info from the server dynamically
		// also include activities?
		if (lang == "en") {
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Arts");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Dets");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Gerunds");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-NounCountability");
			//wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Passives");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-PhrasalVerbs");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Preps");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-WhQuestions");
			
			//wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Konjunktiv");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-SerEstar");
		} else if (lang == "es") {
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Dets");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Preps");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-SerEstar");
			
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Arts");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Gerunds");
			//wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Konjunktiv");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-NounCountability");
			//wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Passives");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-PhrasalVerbs");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-WhQuestions");
		} else if (lang == "de") {
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Dets");
			//wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Konjunktiv");
			wertiview.toolbar.enableMenuItem("wertiview-toolbar-topic-Preps");
			
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Arts");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Gerunds");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-NounCountability");
			//wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-Passives");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-PhrasalVerbs");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-SerEstar");
			wertiview.toolbar.disableMenuItem("wertiview-toolbar-topic-WhQuestions");
		}
		
		// switch to "Pick a Topic" if the selected topic isn't available for
		// the currently selected language
		options = wertiview.getOptions();
		if (document.getElementById('wertiview-toolbar-topic-' + options['topic']).disabled == true) {
			var menu = document.getElementById("wertiview-toolbar-topic-menu");
			var item = document.getElementById("wertiview-toolbar-topic-unselected");
			menu.selectedItem = item;
		}
	},
	
	enableMenuItem: function(id) {
		var item = document.getElementById(id);
		item.disabled = false;
	},
	
	disableMenuItem: function(id) {
		var item = document.getElementById(id);
		item.disabled = true;
	},

	enableRunButton: function() {
		var button = document.getElementById("wertiview-toolbar-single-button");
		//button.disabled = true;
		button.style["display"] = "inline";
	},

	disableRunButton: function(id) {
		var button = document.getElementById("wertiview-toolbar-single-button");
		//button.disabled = true;
		button.style["display"] = "none";
	},

	enableRestoreButton: function() {
		var button = document.getElementById("wertiview-toolbar-remove-button");
		//button.disabled = true;
		button.style["display"] = "inline";
	},

	disableRestoreButton: function(id) {
		var button = document.getElementById("wertiview-toolbar-remove-button");
		//button.disabled = true;
		button.style["display"] = "none";
	},

	enableAbortButton: function() {
		var button = document.getElementById("wertiview-toolbar-abort-button");
		button.style["display"] = "inline";
	},

	disableAbortButton: function(id) {
		var button = document.getElementById("wertiview-toolbar-abort-button");
		button.style["display"] = "none";
	},
	
	showSpinningWheel: function() {
		var animation = document.getElementById("wertiview-toolbar-loading-image");
		animation.style["display"] = "inline";
	},

	hideSpinningWheel: function() {
		var animation = document.getElementById("wertiview-toolbar-loading-image");
		animation.style["display"] = "none";
	},

	initSignInOutInterfaces: function() {
		var itemIn = document.getElementById("wertiview-toolbar-openid-signinlink");
		itemIn.href = wertiview.serverURL + "/openid/sign-in-prompt.html";
		var itemOut = document.getElementById("wertiview-toolbar-openid-signoutlink");
		itemOut.href = wertiview.serverURL + "/openid/logout.jsp";
	},

	enableSignInInterface: function() {
		var item = document.getElementById("wertiview-toolbar-openid-signinlink");
		item.style["display"] = "inline";
	},
	
	disableSignInInterface: function() {
		var item = document.getElementById("wertiview-toolbar-openid-signinlink");
		item.style["display"] = "none";
	},

	setSignedInAs: function(userid) {
		var item = document.getElementById("wertiview-toolbar-openid-signedinuserid");
		item.value = userid;
	},

	enableSignOutInterface: function() {
		var item1 = document.getElementById("wertiview-toolbar-openid-signedinstatus");
		item1.style["display"] = "inline";
		var item3 = document.getElementById("wertiview-toolbar-openid-signedinuserid");
		item3.style["display"] = "inline";
		var item2 = document.getElementById("wertiview-toolbar-openid-signoutlink");
		item2.style["display"] = "inline";
	},
	
	disableSignOutInterface: function() {
		var item1 = document.getElementById("wertiview-toolbar-openid-signedinstatus");
		item1.style["display"] = "none";
		var item3 = document.getElementById("wertiview-toolbar-openid-signedinuserid");
		item3.style["display"] = "none";
		var item2 = document.getElementById("wertiview-toolbar-openid-signoutlink");
		item2.style["display"] = "none";
	}
	};

	// set the appropriate toolbar menu selections
	wertiview.toolbar.initialize();
});
