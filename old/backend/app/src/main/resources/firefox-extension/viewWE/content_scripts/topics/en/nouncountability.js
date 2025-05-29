view.nouncountability = {	
	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$("span.wertiviewCOUNT").addClass("colorizeStyleCount");
		$("span.wertiviewNONCOUNT").addClass("colorizeStyleNoncount");
		$("span.wertiviewBOTH").addClass("colorizeStyleBoth");
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
		var $countHits = $("span.wertiviewCOUNT");
		var $noncountHits = $("span.wertiviewNONCOUNT");
		
		// TODO: better ideas for a way to make a mixed exercise
		//       that is quick to calculate?

		var countHitList = [];
		$countHits.each( function() {
			countHitList.push($(this));
		});
		var noncountHitList = [];
		$noncountHits.each( function() {
			noncountHitList.push($(this));
		});
		
		// ratio of noncount nouns to all nouns (between 0 and 1)
		var noncountRatio = 20 / 100.0;
	
		// non count
		view.interaction.mcHandler(noncountHitList, 
				view[view.topicName].inputHandler, 
				view[view.topicName].hintHandler, 
				view[view.topicName].getOptions, 
				view[view.topicName].getCorrectAnswer,
				view[view.topicName].color, 
				false, 
				noncountRatio);
		
		// count 
		view.interaction.mcHandler(countHitList, 
				view[view.topicName].inputHandler, 
				view[view.topicName].hintHandler, 
				view[view.topicName].getOptions, 
				view[view.topicName].getCorrectAnswer,
				view[view.topicName].color, 
				false, 
				1-noncountRatio);
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
		
		$(".wertiviewanswered").each( function() {
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		$(".wertiviewinput").each( function() {
			$(this).parent().replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		$(".wertiviewhint").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red.
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if($(element).hasClass("wertiviewNONCOUNT")) {
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
			$text.addClass("wertiviewanswered");
			$text.data("wertivieworiginaltext", $(element).data("wertivieworiginaltext"));
			$text.addClass("clozeStyleCorrect");
			$text.text($(element).data("wertivieworiginaltext"));
			$answer = $("<span>");
			$answer.addClass("mcStyleAnswer");
			$answer.text(" (" + $(element).data("wertiviewanswer").toLowerCase() + ")");
			$text.append($answer);
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
		$text.addClass("wertiviewanswered");
		$text.data("wertivieworiginaltext", $(element).prev().data("wertivieworiginaltext"));
		$text.addClass("clozeStyleProvided");
		$text.text($(element).prev().data("wertivieworiginaltext"));
		$answer = $("<span>");
		$answer.addClass("mcStyleAnswer");
		$answer.text(" (" + $(element).prev().data("wertiviewanswer").toLowerCase() + ")");
		$text.append($answer);
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
	 * Gets the options provided by the variable types.
	 */
	getOptions: function($hit, capType){
		var types = ["count", "noncount"];
		return types;
	},

	/*
	 * Get the correct answer for the mc and cloze activities.
	 */
	getCorrectAnswer: function($hit, capType){
		if ($hit.hasClass("wertiviewCOUNT")) {
			return "count";
		}
		else {
			return "noncount";
		}
	},
	
	/*
	 * Hits are highlighted.
	 */
	color: function($hit, capType){
		$hit.append(" ");
		$hit.addClass("mcStyleHighlight");
	}
};