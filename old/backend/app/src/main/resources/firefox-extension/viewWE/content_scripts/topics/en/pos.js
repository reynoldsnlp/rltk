view.pos = {	
	// candidates for mc options presented to user
	types: [],
	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$("viewenhancement").addClass("colorizeStyle" + topicCSS);
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
		$("viewtoken").addClass("clickStylePointer");
	
		// handle click
		$("body").on("click", "viewtoken", view[view.topicName].clickHandler); 
	},
	
	/*
	 * Run the multiple choice activity.
	 * Get all potential spans and call the mcHandler.
	 */
	mc: function() {	
		console.log("mc()");
		
		// get potential spans
		var $hits = $("span.wertiviewhit");
		
		var hitList = [];
		var tokens = [];
		view[view.topicName].types = [];
		$hits.each( function() {
			hitList.push($(this));
			tokens[$(this).text().toLowerCase()] = 1;
		});
		
		for (word in tokens) {
			view[view.topicName].types.push(word);
		}
	
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
		var $hits = $("viewenhancement");
	
		var hitList = [];
		$hits.each( function() {
			hitList.push($(this));				
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
		
		$("body").off("click", "viewtoken");
		$("body").off("change", "select.viewinput");
		$("body").off("click", "viewhint");
		$("body").off("change", "input.viewinput");
		$("body").off("click", "viewhint");
		
		// replace the input spans with the original text
		$("input.viewinput").each( function() {
			$(this).replaceWith($(this).data("vieworiginaltext"));
		});
		
		$("viewhint").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if($(element).children().is("viewenhancement")) {
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
		var countsAsCorrect = false;
		var element = this;
	    var inputId = $(".viewinput").index(this);
		
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
		if($(element).val().toLowerCase() == $(element).data("viewanswer").toLowerCase()) {
			countsAsCorrect = true;
			$text = $("<viewenhancement>");
			$text.addClass("clozeStyleCorrect");
			$text.text($(element).data("viewanswer"));
			view.lib.replaceInput($(element).parent(), $text);

            view[view.topicName].jumpTo(inputId);

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
		var element = this;
	    var inputId = $(".viewinput").index(this);

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
		$text = $("<viewenhancement>");
		$text.addClass("clozeStyleProvided");
		$text.text($(element).prev().data("viewanswer"));
		view.lib.replaceInput($(element).parent(), $text);

		view[view.topicName].jumpTo(inputId);

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
	 * Gets the options provided by the variable types.
	 */
	getOptions: function($hit, capType){
		var options = [];
		var j = 0;
		
		// Get the list of distractors for the given hit 
		var types = view[view.topicName].types;
	    
	    // Add the distractor forms to the options list:
	    while (j < types.length && options.length < 4) {
	        if (types[j].toLowerCase() != $hit.text().toLowerCase() && types[j] != "") 
	        {
	           options.push(view.lib.matchCapitalization(types[j], capType)); 
	        }
			j++;
		}
		
		options.push(view.lib.matchCapitalization($hit.text(), capType));
		view.lib.shuffleList(options);
		return options;
	},

	/*
	 * Get the correct answer for the mc and cloze activities.
	 */
	getCorrectAnswer: function($hit, capType){
		return $hit.text().trim();
	},

	/*
	 * Jump to the
	 * - input element if it exists
	 * - previous input element if it exists
	 */
	jumpTo: function(inputId){
        var input = ".viewinput:eq("+inputId+")";
        var prevInput = ".viewinput:eq("+(inputId-1)+")";
        if($(input).length){
            $(input).focus();
            // Scroll to the middle of the viewport
            $(window).scrollTop($(input).offset().top - ($(window).height() / 2));
        }
        else if($(prevInput).length){
            $(prevInput).focus();
            // Scroll to the middle of the viewport
            $(window).scrollTop($(prevInput).offset().top - ($(window).height() / 2));
        }
	}
};