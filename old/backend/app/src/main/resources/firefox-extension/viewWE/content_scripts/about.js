view.about = {
	/*
	 * The extension send the message to open the about dialog.
	 * Create it with "about.html" and insert the image "view-128.png".
	 * Show the about dialog over the background page. 
	 */
	open: function(request, sender, sendResponse) {
		if(request.msg == "open about dialog"){
			console.log("open: received '" + request.msg + "'");
			// get the url of the about page
			var aboutDialog = chrome.extension.getURL("content_scripts/about.html");
			
			// get the url of the view icon
			var viewLogo = chrome.extension.getURL("icons/view-128.png");
			
			// create image element with the view icon
			var $viewImg = $("<img>");
			$viewImg.attr("src", viewLogo);
			
			// get the website's dimensions
		    var wHeight = $(window).height();
		    var dHeight = wHeight * 0.8;
		    
			// create and open the about dialog 
		    var $aboutDialog = $("<div>");
		    
		    // load the about page and append the view icon
		    $aboutDialog.load(aboutDialog, function() {    	
		    	// attach the view icon to the span element
		    	$("#view-icon").append($viewImg);
		    });
		    
		    // create the about dialog
		    $aboutDialog.dialog({
				modal: true,
				title: "About VIEW",
				overlay: { opacity: 0.1, background: "black" },
				width: "auto",
				height: dHeight,
				draggable: true,
		        resizable: true,
		        open: function( event, ui ) {
		        	// remove open() as a listener so that a second about dialog can't be opened
		        	chrome.runtime.onMessage.removeListener(view.about.open);
		        }
			});
		    
			//assign open() as a listener for messages from the extension when the dialog is closed
		    $aboutDialog.on('dialogclose', function(event) {
		    	console.log("click on X: close about dialog");
		    	chrome.runtime.onMessage.addListener(view.about.open);
		    	// remove the about dialog so that it can be loaded properly next time
		    	$aboutDialog.remove();
		    });
		};	
	}	
};

//assign open() as a listener for messages from the extension
chrome.runtime.onMessage.addListener(view.about.open);