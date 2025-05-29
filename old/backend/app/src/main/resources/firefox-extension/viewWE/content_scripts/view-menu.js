view.VIEWmenu = {
	add: function(){
		// get the url of the about page
		var menuViewHTML = chrome.extension.getURL("content_scripts/view-menu.html");

		// create and open the about dialog 
		var $menuView = $("<div>");

		// load the about page and append the view icon
		$menuView.load(menuViewHTML, function() {  	    	
			// Close the dropdown menu if the user clicks outside of it
			$(window).on("click", function(event){
				$menuViewContent = $("#view-VIEW-menu-content");
				if($menuViewContent.is(":visible")){
					$menuViewContent.hide();
				}	    		
			});
			
			// open the option page when in the toolbar "options" was clicked
		    $("#view-VIEW-menu-options").on("click",function() {    	
		    	console.log("click on options:  request 'open options page'");
		    	chrome.runtime.sendMessage({
				    msg: "open options page"
				});
		    });
		    
		    // open the help page when in the toolbar "help" was clicked
		    $("#view-VIEW-menu-help").on("click",function() {
				console.log("click on help: open help page");
				chrome.runtime.sendMessage({
				    msg: "open help page"
				});
		    }); 
		    
		    // on clicking "about", send a request to the background page in the active tab
		    $("#view-VIEW-menu-about").on("click",function() {
		    	console.log("click on about: request 'open about dialog'");
		    	chrome.runtime.sendMessage({
				    msg: "open about dialog"
				});	    
		    }); 
		});

		$("body").prepend($menuView);
	}
};