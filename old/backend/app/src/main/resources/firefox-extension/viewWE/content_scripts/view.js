view = {
	// General options
	serverURL: "https://view.aleks.bg",
	servletURL: "https://view.aleks.bg/view",
	cookie_name: "wertiview_userid",
	cookie_path: "/VIEW/openid",
	ajaxTimeout: 60000,
	topics: {},
	userEmail: "",
	userid: "",
	
	// user options (defaults)
	fixedOrPercentage: 0,
    fixedNumberOfExercises: 25,
    proportionOfExercises: 100,
    choiceMode: 0,
    firstOffset: 0,
    intervalSize: 1,
    showInst: false,
    
    // enabled, language, topic and activity selections (default)
    enabled: false, // should the page be enhanced right away?
    language: "unselected",
    topic: "unselected",
    activity: "unselected",
    
    // the topic name which is used to call the topic modules
    // e.g. topic = "RusNouns", topic name = "rusnouns"
    topicName: "unselected",
    
	/*
	 * Save general options to the storage.
	 * This options can't be changed by the user.
	 */
	saveGeneralOptions: function(){
		console.log("saveGeneralOptions()");
		chrome.runtime.sendMessage({
                msg: "call sendTopics"
            }, function(response){
                console.log("received response: got topics JSON object.");
                view.topics = response.topics;

                chrome.storage.local.get(["userEmail",
                                      "userid",
                                      "enabled"], function (res) {
                chrome.storage.local.set({
                    serverURL: view.serverURL,
                    servletURL: view.servletURL,
                    cookie_name: view.cookie_name,
                    cookie_path: view.cookie_path,
                    ajaxTimeout: view.ajaxTimeout
                });
                // set the user email and user id
                if(res.userid == undefined){ //  to the default
                    chrome.storage.local.set({
                        userEmail: view.userEmail,
                        userid: view.userid
                    });
                }
                else{ // to the stored values
                    view.userEmail = res.userEmail;
                    view.userid = res.userid;
                }

                // set the enabled auto-run true/false option
                if (res.enabled == undefined){ // to the default
                    chrome.storage.local.set({
                        enabled: view.enabled
                    });
                }
            });
        });
	},
	
	/*
	 * Initialize all user options and make them accessible to VIEW.
	 * Afterwards start enhancing.
	 */
	initUserOptions: function(){
		console.log("initUserOptions()");
		chrome.storage.local.get(["fixedOrPercentage",
		                          "fixedNumberOfExercises",
		                          "proportionOfExercises",
		                          "choiceMode",
		                          "firstOffset",
		                          "intervalSize",
		                          "showInst",
		                          "enabled",
		                          "language",
		                          "topic",
		                          "activity"], function (res) {   
			if(chrome.runtime.lastError){
		        // an error occurred, do nothing
				console.log("initUserOptions: Storage error occurred!\n" + chrome.runtime.lastError); 				
		    } 
			else if(res.language == undefined || res.topic == undefined || res.activity == undefined){
				console.log("initUserOptions: user didn't select language, topic or activity." +
				"Use default values.");			
		    } 
			else if(res.fixedOrPercentage == undefined){
				console.log("initUserOptions: in the options page no options were set yet, " +
						"set enabled autorun, language, topic and activity and use default values for the rest.");			
				
				// enabled, language, topic and activity selections (default)
				view.enabled = res.enabled;
				view.language = res.language;
				view.topic = res.topic;
				view.activity = res.activity;
				
				// set the topic name
				view.topicName = view.interaction.getTopicName(view.topic);			
			} else{
				// the storage items are available, update...
				// user options
				view.fixedOrPercentage = res.fixedOrPercentage;
				view.fixedNumberOfExercises = res.fixedNumberOfExercises;
				view.proportionOfExercises = res.proportionOfExercises;
				view.choiceMode = res.choiceMode;
				view.firstOffset = res.firstOffset;
				view.intervalSize = res.intervalSize;
				view.showInst = res.showInst;
			    
				// enabled, language, topic and activity selections (default)
				view.enabled = res.enabled;
				view.language = res.language;
				view.topic = res.topic;
				view.activity = res.activity;
				
				// set the topic name
				view.topicName = view.interaction.getTopicName(view.topic);			
			}
			
			// start enhancing the page
			view.interaction.enhance();
		});
	}
};

/*
 * Processes all messages received from background.js.
 * Sends requests to backround.js or handles requests here.
 */
function processMessageForView(request, sender, sendResponse) {
	switch(request.msg) {
	    case "call initUserOptions":
	        console.log("initUserOptions: received '" + request.msg + "'");
	    	// initialize the user options and save them globally
            view.initUserOptions();
	}
}

chrome.runtime.onMessage.addListener(processMessageForView);