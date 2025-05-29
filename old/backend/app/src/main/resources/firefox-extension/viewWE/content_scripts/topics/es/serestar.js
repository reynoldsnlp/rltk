view.serestar = {	
	// map from hit text to distractor
	hit2distractor: {},
	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$('span.wertiviewSer').addClass('colorizeStyleSer');
		$('span.wertiviewEstar').addClass('colorizeStyleEstar');
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
		
		// randomly pick wertiviewSer or wertiviewEstar
		var binaryRand = view.lib.getRandom(1);
		var clickClass = 'wertiviewSer';
		if (binaryRand == 1) {
			clickClass = 'wertiviewEstar';
		}
		$('body').data('wertiviewClickClass', clickClass);

		// add instructions
		var message = 'Please click on all forms of <b>';
		
		if (clickClass == 'wertiviewSer') {
			message += 'ser';
		} else {
			message += 'estar';
		}
		message += '</b>.';
		
		// show the instructions, they can't be avoided (show up each time)
		view.notification.addInst(message, false);
	
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
		var $hits = $('span.wertiviewSer, span.wertiviewEstar');
		
		// TODO: see if there's a better way to figure out
		// environment-related character encoding problems
		//var inExtension = wertiview.lib.inExtension();
		
		var hitList = [];
		view[view.topicName].hit2distractor = {};
		$hits.each( function() {
			var hittext = $(this).text().toLowerCase();
			var distractor;
			if ($(this).hasClass('wertiviewSer')) {
				distractor = view[view.topicName].serToEstar[hittext];
				if (distractor == undefined) {
					distractor = view[view.topicName].serToEstar[view.lib.encodeUTF8(hittext)];
				}
			} else {
				distractor = view[view.topicName].estarToSer[hittext];
				if (distractor == undefined) {
					distractor = view[view.topicName].estarToSer[view.lib.encodeUTF8(hittext)];
				}
			}

//			if (!inExtension) {
//				distractor = wertiview.lib.decodeUTF8(distractor);
//			}
			if (distractor == null) {
				return;
			}

			view[view.topicName].hit2distractor[hittext] = distractor;
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
		var $hits = $('span.wertiviewSer, span.wertiviewEstar');
		
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
		
		$("body").off("click", "span.wertiviewtoken");
		$("body").off("change", "select.wertiviewinput");
		$("body").off("click", "span.wertiviewhint");
		$("body").off("change", "input.wertiviewinput");
		$("body").off("click", "input.wertiviewhint");
		
		// replace the input spans with the original text
		$(".wertiviewinput").each( function() {
			$(this).replaceWith($(this).data("wertiviewanswer"));
		});
		
		$(".wertiviewhint").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var clickClass = $('body').data('wertiviewClickClass');
		var element = this;
		var infos = {};
		
		if($(element).hasClass(clickClass)) {
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
	 * Gets the options provided by the variable hit2distractor.
	 */
	getOptions: function($hit, capType){
		var options;
		var hittext = $hit.text().toLowerCase();
		var distractor = view[view.topicName].hit2distractor[hittext];
		if ($hit.hasClass('wertiviewSer')) {
			options = [hittext, distractor];
		} else {
			options = [distractor, hittext];
		}
		return options;
	},

	/*
	 * Get the correct answer for the mc and cloze activities.
	 */
	getCorrectAnswer: function($hit, capType){
		return $hit.text().toLowerCase();
	},
	
	/*
	 * Ser to Estar mappings.
	 */
	serToEstar: {'ser':	'estar',
		'sido':	'estado',
		'siendo':	'estando',
		'soy':	'estoy',
		'eres':	'estás',
		'es':	'está',
		'somos':	'estamos',
		'sois':	'estáis',
		'son':	'están',
		'fui':	'estuve',
		'fuiste':	'estuviste',
		'fue':	'estuvo',
		'fuimos':	'estuvimos',
		'fuisteis':	'estuvisteis',
		'fueron':	'estuvieron',
		'era':	'estaba',
		'eras':	'estabas',
		'era':	'estaba',
		'éramos':	'estábamos',
		'erais':	'estabais',
		'eran':	'estaban',
		'seré':	'estaré',
		'serás':	'estarás',
		'será':	'estará',
		'seremos':	'estaremos',
		'seréis':	'estaréis',
		'serán':	'estarán',
		'sería':	'estaría',
		'serías':	'estarías',
		'sería':	'estaría',
		'seríamos':	'estaríamos',
		'seríais':	'estaríais',
		'serían':	'estarían',
		'sea':	'esté',
		'seas':	'estés',
		'sea':	'esté',
		'seamos':	'estemos',
		'seáis':	'estéis',
		'sean':	'estén',
		'fuera':	'estuviera',
		'fuese':	'estuviese',
		'fueras':	'estuvieras',
		'fueses':	'estuvieses',
		'fuera':	'estuviera',
		'fuese':	'estuviese',
		'fuéramos':	'estuviéramos',
		'fuésemos':	'estuviésemos',
		'fuerais':	'estuvierais',
		'fueseis':	'estuvieseis',
		'fueran':	'estuvieran',
		'fuesen':	'estuviesen',
		'fuere':	'estuviere',
		'fueres':	'estuvieres',
		'fuere':	'estuviere',
		'fuéremos':	'estuviéremos',
		'fuereis':	'estuviereis',
		'fueren':	'estuvieren'},
	
	/*
	 * Estar to Ser mappings.
	 */
	estarToSer: {'estar':	'ser',
		'estado':	'sido',
		'estando':	'siendo',
		'estoy':	'soy',
		'estás':	'eres',
		'está':	'es',
		'estamos':	'somos',
		'estáis':	'sois',
		'están':	'son',
		'estuve':	'fui',
		'estuviste':	'fuiste',
		'estuvo':	'fue',
		'estuvimos':	'fuimos',
		'estuvisteis':	'fuisteis',
		'estuvieron':	'fueron',
		'estaba':	'era',
		'estabas':	'eras',
		'estaba':	'era',
		'estábamos':	'éramos',
		'estabais':	'erais',
		'estaban':	'eran',
		'estaré':	'seré',
		'estarás':	'serás',
		'estará':	'será',
		'estaremos':	'seremos',
		'estaréis':	'seréis',
		'estarán':	'serán',
		'estaría':	'sería',
		'estarías':	'serías',
		'estaría':	'sería',
		'estaríamos':	'seríamos',
		'estaríais':	'seríais',
		'estarían':	'serían',
		'esté':	'sea',
		'estés':	'seas',
		'esté':	'sea',
		'estemos':	'seamos',
		'estéis':	'seáis',
		'estén':	'sean',
		'estuviera':	'fuera',
		'estuviese':	'fuese',
		'estuvieras':	'fueras',
		'estuvieses':	'fueses',
		'estuviera':	'fuera',
		'estuviese':	'fuese',
		'estuviéramos':	'fuéramos',
		'estuviésemos':	'fuésemos',
		'estuvierais':	'fuerais',
		'estuvieseis':  'fueseis',
		'estuvieran':   'fueran',
		'estuviesen':   'fuesen',
		'estuviere':	'fuere',
		'estuvieres':	'fueres',
		'estuviere':	'fuere',
		'estuviéremos':	'fuéremos',
		'estuviereis':	'fuereis',
		'estuvieren':	'fueren'}
};