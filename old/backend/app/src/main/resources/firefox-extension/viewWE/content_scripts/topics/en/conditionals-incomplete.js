view.conditionals = {	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$("span.wertiviewhit").addClass("colorizeStyle" + topicCSS);
	},

	/*
	 * Run the click activity.
	 * Ignore instruction dialogs.
	 * Add css attribute cursor: pointer to each span marked as token.
	 * Call the click handler when the span marked as token was clicked.
	 */
	click: function() {	
		console.log("click()");
	
		// change all wertiviewcs spans to mouseover pointer
		$("span.wertiviewcs").addClass("clickStylePointer");
	
		// handle click
		$("body").on("click", "span.wertiviewcs", view[view.topicName].clickHandler); 
	},	
	
	/*
	 * Remove topic specific markup and restore the page
	 * to the original.
	 */
	restore: function() {
		console.log("restore()");
		
		$("body").off("click", "span.wertiviewcs");
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if($(element).hasClass("wertiviewhit")) {
			countsAsCorrect = true;
			$(element).addClass("clickStyleCorrect");
		} else {
			$(element).addClass("clickStyleIncorrect");
		} 
		
		// remove the mouseover pointer
		$(element).removeClass("clickStylePointer");
		
		if(view.userid){	// if the user is logged in (userid is not null)
			// collect info data before page update
			infos = view.interaction.collectInfoData(
					element,
					false, // usedHint: only true when hint handler
					view.interaction.collectInputData, 
					view.interaction.collectAnswerData);
			
			var info = infos.info;
			var elementInfo = infos.elementInfo;
			
			// collect and send interaction data after page update
			view.interaction.collectInteractionData(
					info,
					elementInfo,
					countsAsCorrect, 
					false); // usedHint: only true when hint handler				
		}	
		
		// prevent execution of further event listeners
		return false;
	}
};