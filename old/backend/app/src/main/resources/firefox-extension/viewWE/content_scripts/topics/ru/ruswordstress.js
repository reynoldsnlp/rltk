view.ruswordstress = {	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		// get potential spans
		var $hits = $("span.wertiviewhit");
		
		$hits.addClass("colorizeWordWithStress");
		
		// replace the original words with the words with stress
		// replace the original words with the words with stress
		$hits.each( function() {
			if(!!$(this).attr("wordwithstress")){
				// retrieve the original word
				var originalWord = $(this).text();
				// save the original text in an attribute
				$(this).attr("wertivieworiginaltext", originalWord);
				// determine capitalization type: type 0, no caps; type 1, all caps; type 2, first letter cap
				var capType = view.lib.detectCapitalization(originalWord);
				// make sure the word with stress is capitalized correctly (like the original text)
				var wordWithStress = view.lib.matchCapitalization($(this).attr("wordwithstress"), capType);				
				// change the original word to the word with stress
				$(this).text(wordWithStress);
			}
		});
	},

	/*
	 * Run the click activity.
	 * Ignore instruction dialogs.
	 * Add css attribute cursor: pointer to each span marked as token.
	 * Call the click handler when the span marked as token was clicked.
	 */
	click: function() {	
		console.log("click()");
		
		// get potential spans
		var $hits = $("span.wertiviewhit");
		
		// replace the original words with the words with stress
		$hits.each( function() {
			var originalWord = $(this).text();
			// determine capitalization type: type 0, no caps; type 1, all caps; type 2, first letter cap
			var capType = view.lib.detectCapitalization(originalWord);
			// make sure the word with stress is capitalized correctly (like the original text)
			var wordWithStress = view.lib.matchCapitalization($(this).attr("wordwithstress"), capType);
			
			//if(originalWord === "ее"){
				// create new span tag for the word with stress
				$text = $("<span>");
				$text.addClass("wertiview");
				$text.addClass("wordWithStress");
				
				// add span markup to each vowel using the class clickVowel
				// if the vowel has stress add class withStress and store the stress marker
				
				var vowelPattern =/ё|Ё|а|е|и|о|у|ы|э|ю|я|А|Е|И|О|У|Ы|Э|Ю|Я/g;
				
				// array containing all possible vowel matches inside the word with stress
				var vowelArr = wordWithStress.match(vowelPattern);
				
				var previousEnd = 0;			
					
				var startIndexOriginal = 0;
				
				var startIndexWordWithStress = 0;
				
				var correctWordWithSpans = "";
				
				jQuery.each(vowelArr, function(index, value) {
					
					//alert("Entered loop");
					
					//alert("The current vowel is =" + value);
										
					var indexOfOriginalMatch = originalWord.indexOf(value, startIndexOriginal);
					
					// FSTUPDATE: Stress markers are used here to find the stressed vowels
					
					// take care of the special case when in the original the letter "е" was used instead of "ё"
					if(indexOfOriginalMatch === -1){
						var correctedVowel = value.replace("ё","е").replace("Ё","Е");
						indexOfOriginalMatch = originalWord.indexOf(correctedVowel, startIndexOriginal);
					}
					
					//alert("The vowel of the original word is at index ="+ indexOfOriginalMatch);
					
					var currentIndexOfMatch = wordWithStress.indexOf(value, startIndexWordWithStress);
					
					//alert("The vowel is at index =" + currentIndexOfMatch);
					
					var firstStressMarker = "\u0301";
					
					var indexOfFirstStressedVowel = wordWithStress.indexOf(value + firstStressMarker, startIndexWordWithStress);
					
					//alert("The index of a potential primary stress vowel =" + indexOfFirstStressedVowel);
					
					var secondStressMarker = "\u0300";
					
					var indexOfSecondStressedVowel = wordWithStress.indexOf(value + secondStressMarker, startIndexWordWithStress);
					
					//alert("The index of a potential secondary stress vowel =" + indexOfSecondStressedVowel);
					
					var $vowelSpan = $("<span>");
					
					$vowelSpan.addClass("clickVowel");
					
					// add the class withStress to vowels that have stress and save the stress marker
					if(currentIndexOfMatch === indexOfFirstStressedVowel){
						//alert("This vowel is with stress =" + value);
						$vowelSpan.addClass("withStress");
						$vowelSpan.attr("stressedVowel", value + firstStressMarker);
					}
					else if(currentIndexOfMatch === indexOfSecondStressedVowel){
						//alert("This vowel is with stress =" + value);
						$vowelSpan.addClass("withStress");
						$vowelSpan.attr("stressedVowel", value + secondStressMarker);
					}
					else if(value === "ё" ||
							value === "Ё"){
						//alert("This vowel is with stress =" + value);
						$vowelSpan.addClass("withStress");
					}					
					$vowelSpan.text(value);
					
					var matchStart = indexOfOriginalMatch;
					
					var matchEnd = matchStart + 1;
					
					//alert(value + " begins at pos =" + matchStart + " and ends at=" + matchEnd);
					
					//alert("The part before the next vowel span is=" + originalWord.slice(previousEnd, matchStart));
					
					var leftSide = correctWordWithSpans + originalWord.slice(previousEnd, matchStart);
					
					var vowelSpanHtml = $vowelSpan.prop("outerHTML");
					
					// dynamically construct the text inside a word with stress
					// vowels are surrounded by span tags
					if(index === vowelArr.length - 1){ // the last vowel match
						//alert("In the last iteration the leftside is =" + leftSide);
						//alert("The html markup is=" + vowelSpanHtml);
						//alert("The rest of the word is=" + originalWord.slice(matchEnd));
						correctWordWithSpans = leftSide + vowelSpanHtml + originalWord.slice(matchEnd);
					}
					else{ // any other vowel match
						correctWordWithSpans = leftSide + vowelSpanHtml;
					}
					
					//alert("Currently the correct word with span is =" + correctWordWithSpans);
					
					// for the next match...
					
					// save the vowel match end from the current match
					previousEnd = matchEnd;
					
					// save the index that indicates where to start to search in the original word
					startIndexOriginal = matchEnd;
					
					// save the index that indicates where to start to search in the word with stress
					startIndexWordWithStress = currentIndexOfMatch + 1;
					
					// to search the remaining string for a vowel match
				});
			
				//alert("In the end the correct word with span is =" + correctWordWithSpans);
				
				// put the word with the spans for the vowels, into the span tag
				$text.html(correctWordWithSpans);
				// save the original text in a hidden field
				$text.data("wertivieworiginaltext", originalWord);
				// replace the wertiviewhit with this span
				$(this).replaceWith($text);
			//}			
		});

		// change all clickVowel spans to mouseover pointer
		$("span.clickVowel").addClass("clickStylePointer");
		
		// handle click
		$("body").on("click", "span.clickVowel", view[view.topicName].clickHandler); 
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
		
		$hits.each( function() {
			hitList.push($(this));
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
		var $hits = $("span.wertiviewhit");
	
		$hits.hover(
			// when entering the word...
			function() {
				// retrieve the original word
				var originalWord = $(this).text();
				// determine capitalization type: type 0, no caps; type 1, all caps; type 2, first letter cap
				var capType = view.lib.detectCapitalization(originalWord);
				// make sure the word with stress is capitalized correctly (like the original text)
				var wordWithStress = view.lib.matchCapitalization($(this).attr("wordwithstress"), capType);
				
				// FSTUPDATE: Stress markers are used here to find the stressed vowels
				
				// add color to the stressed vowel
				// а́ е́ ё и́ о́ у́ ы́ э́ ю́ я́
		    	// А́ Е́ Ё И́ О́ У́ Ы́ Э́ Ю́ Я́ 
				var stressPattern =/ё|Ё|(а|е|и|о|у|ы|э|ю|я|А|Е|И|О|У|Ы|Э|Ю|Я)(\u0301|\u0300)/g;
				
				var vowelWithStressArr = wordWithStress.match(stressPattern);
				
				jQuery.each(vowelWithStressArr, function( index, value ) {
					
					var $colorizedVowelWithStress = $("<span>");
					
					$colorizedVowelWithStress.css("color", "red");
					
					$colorizedVowelWithStress.text(value);
					
					wordWithStress = wordWithStress.replace(value, $colorizedVowelWithStress.prop("outerHTML"));		
				});
				
				// change the original word to the word with stress
				$(this).html(wordWithStress);
				// save the original text in a hidden field
				$(this).data("wertivieworiginaltext", originalWord);				
			}, 
			// when leaving the word...
			function() {
				// remove the style attribute
				$(this).removeAttr("style");
				// return the text to the original
				$(this).html($(this).data("wertivieworiginaltext"));
			}
		);
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
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		// replace the correct forms correctly answered by the user with the original text
		$(".clozeStyleCorrect").each( function() {
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		// replace the correct forms answered by the hint with the original text
		$(".clozeStyleProvided").each( function() {
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		// replace the words with stress with the original text
		$(".wordWithStress").each( function() {
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		// replace the words with stress selected in the colorize activity with the original text
		$(".colorizeWordWithStress").each( function() {
			$(this).replaceWith($(this).attr("wertivieworiginaltext"));
		});	
		
		// remove the tooltips
		$(".tooltip").remove();
		
		$(".wertiviewhint").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red.
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if($(element).hasClass("withStress")) {
			countsAsCorrect = true;
			$(element).addClass("clickStyleCorrect");
			$(element).text($(element).attr("stressedVowel"));
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
	 * Deals with the input in the mc activity.
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
		
		var contClass = $(element).parent().attr("contClass");
		var $tooltip = $("#"+contClass);

		// if the answer is correct, turn into text, else color text within input
		if($(element).val().toLowerCase() == $(element).data("wertiviewanswer").toLowerCase()) {
			countsAsCorrect = true;
			$text = $("<span>");
			$text.addClass("wertiview");
			$text.addClass("clozeStyleCorrect");
			$text.text($(element).data("wertiviewanswer"));
			// save the original text in a hidden field
			$text.data("wertivieworiginaltext", $(element).data("wertivieworiginaltext"));
			if($(element).data("wertiviewnexthit")) {   
				nextInput = $(element).data("wertiviewnexthit");
			}
			view.lib.replaceInput($(element).parent(), $text);
			// hide tooltip in case it didn"t work
			$tooltip.fadeOut(400);

		} else {
			// turns all options, the topmost element after selection included, as red
			$(element).addClass("clozeStyleIncorrect");
			// remove assigned classes to all options from previous selections
			$(element).find("option").removeAttr("class");
			// turn the selected option red
			$(element).find("option:selected").addClass("clozeStyleIncorrect");
			// turn the not selected options black
			$(element).find("option:not(:selected)").addClass("clozeStyleNeutral");

			// tooltip inspired by http://www.kriesi.at/archives/create-simple-tooltips-with-css-and-jquery
			
			// tooltip was already created
			if($tooltip.length){
				$(element).mouseover(function(){
					$tooltip.css({opacity:0.8, display:"none"}).fadeIn(400);
				}).mousemove(function(kmouse){
					$tooltip.css({left:kmouse.pageX+15, top:kmouse.pageY+15});
				}).mouseout(function(){
					$tooltip.fadeOut(400);
				});		
			}
			// create new tooltip
			else{
				var $table = $($(element).parent().attr("exemplar"));
				
				var name = "tooltip";
				$tooltip = $("<div>");
				$tooltip.addClass(name);
				$tooltip.attr("id", contClass);
				var $content = $("<p>");
				$content.html($table.html());
				$tooltip.html($content);
				$("body").append($tooltip);	
		
				$(element).mouseover(function(){
					$tooltip.css({opacity:0.8, display:"none"}).fadeIn(400);
				}).mousemove(function(kmouse){
					$tooltip.css({left:kmouse.pageX+15, top:kmouse.pageY+15});
				}).mouseout(function(){
					$tooltip.fadeOut(400);
				});		
			}
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
	 * Deals with the hint in the mc activity.
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
		// save the original text in a hidden field
		$text.data("wertivieworiginaltext", $(element).prev().data("wertivieworiginaltext"));
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
	 * Gets the options provided by the server in the distractors attribute.
	 */
	getOptions: function($hit, capType){
		var options = [];
		var j = 0;
		
		// Get the list of distractors for the given hit 
		// (they are saved as a space-separated list in the attribute "distractors" of the wertiview span tag):
		var types = $hit.attr("distractors").split(" ");
		
		var answerIndex = types.indexOf($hit.attr("wordwithstress"));
	    
	    // Add the distractor forms to the options list:
	    while (j < types.length && options.length < 4) {
	        // The forms that are homonymous to the correct form are excluded from the list of options:
	        if (types[j].toLowerCase() != $hit.attr("wordwithstress").toLowerCase() && types[j] != "") 
	        {
	           options.push(view.lib.matchCapitalization(types[j], capType)); 
	        }
			j++;
		}
		
	    options.splice(answerIndex, 0, view.lib.matchCapitalization($hit.attr("wordwithstress"), capType));
	    
		return options;
	},

	/*
	 * Get the correct answer for the mc activity.
	 */
	getCorrectAnswer: function($hit, capType){
		return view.lib.matchCapitalization($hit.attr("wordwithstress"), capType);
	}
};