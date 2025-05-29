view.gerunds = {	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$("span.wertiviewGER").addClass("colorizeStyleGER");
		$("span.wertiviewINF").addClass("colorizeStyleINF");
		$("span.wertiviewINFSPLIT").addClass("colorizeStyleINFSPLIT");
		$("span.wertiviewCLU-GERONLY, " + 
			"span.wertiviewCLU-INFONLY, " + 
			"span.wertiviewCLU-BOTHMEANSAME, " + 
			"span.wertiviewCLU-BOTHMEANDIFF, " + 
			"span.wertiviewCLU-FIXEDEXP").addClass("colorizeStyleCLU");
	},

	/*
	 * Run the click activity.
	 * Ignore instruction dialogs.
	 * Add css attribute cursor: pointer to each span marked as token.
	 * Call the click handler when the span marked as token was clicked.
	 */
	click: function() {	
		console.log("click()");
	
		// change all wertiviewtoken spans to mouseover pointer
		$("span.wertiviewtoken").addClass("clickStylePointer");
		
		// gerund and infinitive markup
		var $gerunds = $("span.wertiviewRELEVANT").find("span.wertiviewGER");
		var $infinitives = $("span.wertiviewRELEVANT").find("span.wertiviewINF");
		
		$gerunds.addClass("colorizeStyleGER");
		$infinitives.addClass("colorizeStyleINF");

		// correct cursor inside wertiviewtokens within multi-word spans TODO: move to css file?
		$gerunds.css({"cursor": "text"});
		$infinitives.css({"cursor": "text"});
		$infinitives.children().css({"cursor": "text"});
	
		// handle click
		$("body").on("click", "span.wertiviewtoken", view[view.topicName].clickHandler); 
	},
	
	/*
	 * Run the multiple choice activity.
	 * Get all potential spans and call the mcHandler.
	 */
	mc: function() {	
		console.log("mc()");
		
		// get potential spans
		var $hits = $("span.wertiviewRELEVANT").find("span.wertiviewGER, span.wertiviewINF");
		
		var hitList = []; 
		$hits.each( function() {
			// if this is a split infinitive, skip
			if ($(this).find(".wertiviewINFSPLIT").length == 0) {
				var options = $(this).attr("title").split(";");
				// if the infinitive or gerund isn"t given in the markup, skip
				for (var j = 0; j < options.length; j++) {
					if (options[j] == "null") {
						return;
					}
				}
				hitList.push($(this));				
			}
		});
	
		view.interaction.mcHandler(hitList, 
				view[view.topicName].inputHandler, 
				view[view.topicName].hintHandler, 
				view[view.topicName].getOptions, 
				view[view.topicName].getCorrectAnswer);
	},
	
	/*
	 * Run the cloze activity.
	 * Get all potential spans and call the clozeHandler.
	 */
	cloze: function() {
		console.log("cloze()");
		
		// get potential spans
		var $hits = $("span.wertiviewRELEVANT").find("span.wertiviewGER, span.wertiviewINF");

		var hitList = []; 
		$hits.each( function() {
			// if this is a split infinitive, skip
			if ($(this).find(".wertiviewINFSPLIT").length == 0) {
				hitList.push($(this));				
			}
		});
	
		view.interaction.clozeHandler(hitList, 
				view[view.topicName].inputHandler, 
				view[view.topicName].hintHandler, 
				view[view.topicName].getCorrectAnswer);
	},
	
	/*
	 * Remove topic specific markup and restore the page
	 * to the original.
	 */
	restore: function() {
		console.log("restore()");
		
		$("body").off("click", "span.wertiviewtoken");
		$("body").off("change", "select.wertiviewinput");
		$("body").off("click", "span.wertiviewhint");
		$("body").off("change", "input.wertiviewinput");
		$("body").off("click", "input.wertiviewhint");
		
		// replace the input spans with the original text
		$(".wertiviewinput").each( function() {
			$(this).replaceWith($(this).data("wertiviewanswer"));
		});
		
		$("span.wertiviewbaseform").remove();
		$(".wertiviewhint").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if ($(element).parents(".wertiviewRELEVANT").length == 0) {
			// not within a relevant phrase
			$(element).addClass("clickStyleIncorrect");

		} else if ($(element).hasClass("wertiviewGER") ||
				$(element).hasClass("wertiviewINF") ||
				$(element).find(".wertiviewGER, .wertiviewINF").length > 0) {
			// an already colored gerund or infinitive

		} else if ($(element).hasClass("wertiviewCLU-BOTHMEANDIFF") ||
				$(element).hasClass("wertiviewCLU-BOTHMEANSAME") || 
				$(element).hasClass("wertiviewCLU-FIXEDEXP") ||
				$(element).hasClass("wertiviewCLU-GERONLY") || 
				$(element).hasClass("wertiviewCLU-INFONLY") || 
				$(element).find(".wertiviewCLU-BOTHMEANDIFF, "+ 
						".wertiviewCLU-BOTHMEANSAME, " + 
						".wertiviewCLU-FIXEDEXP, " +
						".wertiviewCLU-GERONLY, " +
						".wertiviewCLU-INFONLY").length > 0) {
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
	},

	/*
	 * Deals with the input in the mc and cloze activities.
	 */
	inputHandler: function(event) {
		var nextInput;
		var countsAsCorrect = false;
		var element = this;
		
		var userid = view.userid;
		var infos = {};
		
		if(userid){	// if the user is logged in (userid is not null)
			// collect info data before page update
			infos = view.interaction.collectInfoData(
					element,
					false, // usedHint: only true when hint handler
					view.interaction.collectInputData, 
					view.interaction.collectAnswerData);
		}

		// if the answer is correct, turn into text, else color text within input
		if($(element).val().toLowerCase() == $(element).data("wertiviewanswer").toLowerCase()) {
			countsAsCorrect = true;
			$text = $("<span>");
			$text.addClass("wertiview");
			$text.addClass("clozeStyleCorrect");
			$text.text($(element).data("wertiviewanswer"));
			if($(element).data("wertiviewnexthit")) {   
				nextInput = $(element).data("wertiviewnexthit");
			}
			view.lib.replaceInput($(element).parent(), $text);

		} else {
			// turns all options, the topmost element after selection included, as red
			$(element).addClass("clozeStyleIncorrect");
			// remove assigned classes to all options from previous selections
			$(element).find("option").removeAttr("class");
			// turn the selected option red
			$(element).find("option:selected").addClass("clozeStyleIncorrect");
			// turn the not selected options black
			$(element).find("option:not(:selected)").addClass("clozeStyleNeutral");
		}
		
		if(userid){	// if the user is logged in (userid is not null)	
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
	},

	/*
	 * Deals with the hint in the mc and cloze activities.
	 */
	hintHandler: function(event) {
		var nextInput;
		var element = this;

		var userid = view.userid;
		var infos = {};
		
		if(userid){	// if the user is logged in (userid is not null)
			// collect info data before page update
			infos = view.interaction.collectInfoData(
					element,
					true, // usedHint: only true when hint handler
					view.interaction.collectInputData, 
					view.interaction.collectAnswerData);
		}

		// fill in the answer by replacing input with text
		$text = $("<span>");
		$text.addClass("wertiview");
		$text.addClass("clozeStyleProvided");
		$text.text($(element).prev().data("wertiviewanswer"));
		if($(element).prev().data("wertiviewnexthit")) {  
			nextInput = $(element).prev().data("wertiviewnexthit");
		}
		view.lib.replaceInput($(element).parent(), $text);
		
		if(userid){	// if the user is logged in (userid is not null)	
			var info = infos.info;
			var elementInfo = infos.elementInfo;
			
			// collect and send interaction data after page update
			view.interaction.collectInteractionData(
					info,
					elementInfo,
					true, // if the user used a hint, then it is definitely a correct answer
					true); // usedHint: only true when hint handler
		}		
		
		// prevent execution of further event listeners
		return false;
	},

	/*
	 * Gets the options provided by the attribute title.
	 */
	getOptions: function($hit, capType){
		var options = $hit.attr("title").split(";");
		return options;
	},

	/*
	 * Get the correct answer for the mc and cloze activities.
	 */
	getCorrectAnswer: function($hit, capType){
		return $hit.text();
	},
	
	/*
	 * Add the baseform next to
	 * the input field (used in cloze).
	 */
	clozeAddBaseform: function($hit, capType){
		// create baseform info
		var $baseform = $("<span>");
		$baseform.addClass("clozeStyleBaseform");
		$baseform.addClass("wertiviewbaseform");
		var verbforms = $hit.attr("title").split(";");
		$baseform.text(" (" + verbforms[0] + ")");
		$hit.append($baseform);	
	}
};