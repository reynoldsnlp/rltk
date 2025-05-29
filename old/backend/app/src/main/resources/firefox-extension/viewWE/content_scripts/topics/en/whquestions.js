view.whquestions = {	
	relevantChunks: {'wertiviewAUX': 'aux/modal verb',
		  'wertiviewSUBJ': 'subject',
		  'wertiviewNFIN': 'non-finite verb',
		  'wertiviewMVERB': 'main finite verb',
		  'wertiviewWHS': 'wh-subject',
		  'wertiviewWH': 'wh-phrase'},
	
	/*
	 * Run the colorize activity.
	 * Add css attribute color to span marked as hit.
	 */
	colorize: function(topicCSS) {
		console.log("colorize()");
		
		$('span.wertiviewWHS').addClass('colorizeStyleWHS');
		$('span.wertiviewWH').addClass('colorizeStyleWH');
		$('span.wertiviewSUBJ').addClass('colorizeStyleSUBJ');
		$('span.wertiviewMVERB').addClass('colorizeStyleMVERB');
		$('span.wertiviewNFIN').addClass('colorizeStyleNFIN');
		$('span.wertiviewAUX').addClass('colorizeStyleAUX');
	},

	/*
	 * Run the click activity.
	 * Ignore instruction dialogs.
	 * Add css attribute cursor: pointer to each span marked as token.
	 * Call the click handler when the span marked as token was clicked.
	 */
	click: function() {	
		console.log("click()");
	
		// initially mark all chunks as not targets
		$('span.wertiviewchunk').data('wertiview-whquestion-target', false);
		
		var findTargets = Array();
		for (className in view[view.topicName].relevantChunks) {
			findTargets.push('span.' + className);
		}
		var findTargetsString = findTargets.join(',');
		
		$('span.wertiviewQ').each( function () {
			var $targets = $(this).find(findTargetsString);
			var $target = $targets.eq(view.lib.getRandom($targets.length - 1));
			// set random target to true
			$target.data('wertiview-whquestion-target', true);
			
			// add category to end of question
			var $targetspan = $('<span>');
			
			var clickStyleTarget = 'clickStyleWH';
			if ($target.hasClass('wertiviewWHS')) {
				clickStyleTarget = 'clickStyleWHS';
			} else if ($target.hasClass('wertiviewWH')) {
				clickStyleTarget = 'clickStyleWH';
			} else if ($target.hasClass('wertiviewSUBJ')) {
				clickStyleTarget = 'clickStyleSUBJ';
			} else if ($target.hasClass('wertiviewMVERB')) {
				clickStyleTarget = 'clickStyleMVERB';
			} else if ($target.hasClass('wertiviewNFIN')) {
				clickStyleTarget = 'clickStyleNFIN';
			} else if ($target.hasClass('wertiviewAUX')) {
				clickStyleTarget = 'clickStyleAUX';
			}
			
			$targetspan.addClass(clickStyleTarget);
			$targetspan.addClass('wertiview');
			$targetspan.addClass('wertiviewtargetinfo');
			
			var numTargets = 0;
			var targetInfo;
			for (className in view[view.topicName].relevantChunks) {
				if($target.hasClass(className)) {
					numTargets = $(this).find('.' + className).length;
					targetInfo = view[view.topicName].relevantChunks[className];
				}
			}

			// add target info to end of span
			if (targetInfo) {
				$targetspan.text(targetInfo);
			}
			
			// if there's just one of the target, make a click activity
			if (numTargets == 1) {
				// change all wertiviewtoken and wertiviewchunk spans within this question to mouseover pointer
				$(this).find('span.wertiviewtoken').addClass("clickStylePointer");
				$(this).find('span.wertiviewchunk').addClass("clickStylePointer");

				// add the info about what to click
				$(this).append(' ');
				$(this).append($targetspan);
			}
		});
		
		// handle click
		$("body").on("click", "span.wertiviewchunk", view[view.topicName].clickChunkHandler); 
		$("body").on("click", "span.wertiviewtoken", view[view.topicName].clickTokenHandler); 
	},
	
	/*
	 * Run the cloze activity.
	 * Get all potential spans and call the clozeHandler.
	 */
	cloze: function() {
		console.log("cloze()");
		
		var findTargets = Array();
		for (className in view[view.topicName].relevantChunks) {
			findTargets.push('span.' + className);
		}
		var findTargetsString = findTargets.join(',');
		
		var $hits = $('span.wertiviewQ');

		// calculate the number of hits to turn into exercises
        var numExercises = 0;
        var fixedOrPercentage = view.fixedOrPercentage;
        if (fixedOrPercentage == 0) {
            numExercises = view.fixedNumberOfExercises;
        }
        else if (fixedOrPercentage == 1) {
        	numExercises = view.proportionOfExercises / 100.0 * $hits.length;
        }
        else {
        	// we should never get here
        	view.interaction.prefError();
        }
        
        // choose which hits to turn into exercises
        var offset = 0;
        var step = 1;
        var choiceMode = view.choiceMode;
        if (choiceMode == 0) {
        	// randomly choose numExercises exercises from the hits
        	var numHits = $hits.length;
        	var $hitsOnly = {};
        	for (var k=0; k<numHits; k++) {
        		$hitsOnly[k] = $hits[k];
        	}
            $sampledHitsOnly = view.lib.sampleFromObjectProps($hitsOnly, numExercises);
            var i = 0;
            for (var k in $sampledHitsOnly) {
            	$hits[i] = $sampledHitsOnly[k];
            	i++;
            }
        }
        else if (choiceMode == 1) {
        	offset = view.firstOffset;
        }
        else if (choiceMode == 2){
        	step = view.intervalSize;
        }
        else {
        	// we should never get here
        	view.interaction.prefError();
        }
		
		// FIXME this loop cannot be replaced with one over hitList as in the 
		// other topics because that breaks the line marked with '**' below
        var i = -1;
		$hits.each( function () {
			i++;
			if (numExercises <= 0 || i < offset || (i-offset) % step != 0) {
				return;
			}
			numExercises--;
			
			$(this).data('wertiview-original-text', $(this).html());
			$(this).data('wertiview-target-text', $(this).text());
			
			// if this contains links, skip
			if ($(this).find('a').length > 0) {
				return;
			}
			
			// look at all element and text node children
			$(this).contents().each( function () {
				// if they contain non-whitespace
				if(/[^\t\n\r ]/.test(this.data)) {
					var $node = $(this);
					
					// turn text nodes into spans
					if (this.nodeType == 3) {
						$(this).wrap( function () {
							return '<span class="wertiviewtoken wertiviewtextnode"></span>';
						});
						$node = $(this).parent();
					}
				}
			});
			
			$cloneofq = $(this).clone();
			
			// combine all wertiviewtokens (normally just at the end of question)
			// into one node
			$restofq = $('<span class="wertiviewrestofq">');
			$cloneofq.children().each( function() {
				var isChunk = false;
				for (className in view[view.topicName].relevantChunks) {
					if ($(this).hasClass(className)) {
						isChunk = true;
					}
				}
				// if this child is not itself a chunk, doesn't have any parents as chunks, 
				// and doesn't have any children as chunk
				if (!isChunk && $(this).parents(findTargetsString).length == 0 && $(this).find(findTargetsString).length == 0) {
					// figure out whether to add a space, crudely; if
					// - there is a token to the left
					// - this token contains alpha characters
					// - this token doesn't start with '
					if ($restofq.text() != '' && $(this).text().match(/\w/) && $(this).text()[0] != "'") {
							$restofq.append(' ');
					}
					$restofq.append($(this).text());
					$(this).remove();
				}
			});
			$cloneofq.append($restofq);
			
			// create a list with all of the nodes for randomizing
			var childrenList = [];
			$cloneofq.children().each( function() {
				childrenList.push($(this));				
			});
			
			// figure out when it would be best to skip this question, currently:
			// - there are more than 10 tokens
			if (childrenList.length > 10) {
				return;	
			}
			
			// - there is no question mark at the end (suggests sentence segmentation failure)
			if (!$cloneofq.text().match(/\?\s*$/)) {
				return;
			}
			
			// - there is more than one wh-word
			if ($cloneofq.find('.wertiviewWH, .wertiviewWHS').length > 1) {
				return;
			}
			
			// - if intervening text prevent the restofq bit from working properly
			if (view[view.topicName].compareFormat($(this).text()) != view[view.topicName].compareFormat($cloneofq.text())) {
				return;
			}

			// randomize list
			view.lib.shuffleList(childrenList);
			
			// replace the current tokens with the randomized ones
			$(this).empty();
			
			for(var j = 0; j < childrenList.length; j++) {
				var $node = childrenList[j];
				// ** FIXME (see above)
				$(this).append($node);
				
				$node.addClass('clozeStyleNode');

				$node.data('wertiview-cloze-target', $node.parent().attr('id') + "-input");
			}

			// create input field
			var $input = $('<input>');
			$input.attr('type', 'text');
			$input.attr('id', $(this).attr('id') + '-input');
			$input.addClass('clozeStyleInputAdjust');
			$input.addClass('clozeStyleInputUnknown');
			$input.addClass('wertiviewinput');
			$input.data('wertiviewanswer', $(this).text());
			$(this).append($input);
			
			// create check button
			var $check = $('<span>');
			$check.attr('id', $(this).attr('id') + '-check');
			$check.addClass('clozeStyleHint');
			$check.html("&#10003;");
			$check.addClass('wertiviewcheck');
			$(this).append($check);
			
			// create clear button
			var $clear = $('<span>');
			$clear.attr('id', $(this).attr('id') + '-clear');
			$clear.addClass('clozeStyleHint');
			$clear.html("&#10007;");
			$clear.addClass('wertiviewclear');
			$(this).append($clear);

			// create hint ? button
			var $hint = $('<span>');
			$hint.attr('id', $(this).attr('id') + '-hint');
			$hint.addClass('clozeStyleHint');
			$hint.text("?");
			$hint.addClass('wertiviewhint');
			$(this).append($hint);
		});
		
		$("body").on("click", "span.wertiviewQ span.wertiviewchunk", view[view.topicName].spanHandler); 
		$("body").on("click", "span.wertiviewQ span.wertiviewtoken", view[view.topicName].spanHandler); 
		$("body").on("click", "span.wertiviewQ span.wertiviewrestofq", view[view.topicName].spanHandler); 
		$("body").on("click", "span.wertiviewclear", view[view.topicName].cearHandler); 
		$("body").on("keyup keydown blur", 'input.wertiviewinput', view[view.topicName].widthHandler); 
		
		$("body").on("click", "span.wertiviewcheck", view[view.topicName].checkHandler); 
		$("body").on("click", "span.wertiviewhint", view[view.topicName].hintHandler); 
	},
	
	/*
	 * Remove topic specific markup and restore the page
	 * to the original.
	 */
	restore: function() {
		console.log("restore()");
		
		// remove click
		$('body').off('click', 'span.wertiviewchunk');
		$('body').off('click', 'span.wertiviewtoken');
		$('span.wertiviewtargetinfo').remove();
		
		// remove cloze
		$('.wertiviewQ').each( function() {
			if ($(this).find('.wertiviewinput').length > 0) {
				$(this).empty();
				$(this).html($(this).data('wertiview-original-text'));
			}
		});

		$('body').off('click', 'span.wertiviewQ span.wertiviewchunk');
		$('body').off('click', 'span.wertiviewQ span.wertiviewtoken');
		$('body').off('click', 'span.wertiviewQ span.wertiviewrestofq');
		$('body').off('click', 'span.wertiviewcheck');
		$('body').off('click', 'span.wertiviewclear');
		$('body').off('click', 'span.wertiviewhint');
		$('body').off('keyup keydown blur' ,'input.wertiviewinput');
	},
	
	/*
	 * Turn correctly clicked chunk hits green and incorrect ones red
	 */
	clickChunkHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if (!($(element).hasClass('wertiviewAUX') || $(element).hasClass('wertiviewSUBJ') || $(element).hasClass('wertiviewNFIN') || 
				$(element).hasClass('wertiviewMVERB') || $(element).hasClass('wertiviewWHS') || $(element).hasClass('wertiviewWH'))) {
			// ignore the wider wertiviewchunk spans TODO: can be left out completely?

		} else if ($(element).parents('.wertiviewQ').length > 0) {
			if ($(element).data('wertiview-whquestion-target')) {
				countsAsCorrect = true;
				$(element).addClass('clickStyleCorrect');
			} else {
				$(element).addClass('clickStyleIncorrect');
			}
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
	 * Turn correctly clicked token hits green and incorrect ones red
	 */
	clickTokenHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if ($(element).parents('.wertiviewQ').length == 0) {
			// not within a question

		} else if ($(element).parents('.wertiviewAUX,.wertiviewSUBJ,.wertiviewNFIN,.wertiviewMVERB,.wertiviewWHS,.wertiviewWH').length == 0 && 
				$(element).children('.wertiviewAUX,.wertiviewSUBJ,.wertiviewNFIN,.wertiviewMVERB,.wertiviewWHS,.wertiviewWH').length == 0) {
			// non-marked up word within a question
			$(element).addClass('clickStyleIncorrect');			

			// remove the mouseover pointer
			$(element).removeClass("clickStylePointer");

		} else {
			var chunkElements = $(element).parents('span.wertiviewchunk');
			if (chunkElements.length > 0) {
				countsAsCorrect = view[view.topicName].clickChunkHandler(chunkElements.first(), event);
			}
		}		
		
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
	 * Deals with the spans in the cloze activity.
	 */
	spanHandler: function(event) {		
		// not one of the immediate children in the question (pass request on)
		if (!$(this).data('wertiview-cloze-target')) {
			return true;
		}
		
		var $input = $('#' + $(this).data('wertiview-cloze-target'));
		
		var currentText = $input.val();
		var lastChar = currentText.charAt(currentText.length - 1);
		// add a space if the text is not currently empty and we're adding a non-textnode span and the last character isn't 
		// space (since we don't need two) or apostrophe (the only textnode span I can think of where we don't want a trailing
		// space)
		if (currentText != '' && !lastChar.match(/[ ']/)) {
			currentText += ' ';
		}		
		currentText += $(this).text();
		
		$input.val(currentText);
		$input.trigger('keyup');
	
		return false;
	},
	
	/*
	 * Deals with the input in the cloze activity.
	 */
	checkHandler: function(element, event) {
		var countsAsCorrect = false;
		var element = this;
		
		var userid = view.userid;
		var infos = {};
		
		if(userid){	// if the user is logged in (userid is not null)
			// collect info data before page update
			infos = view.interaction.collectInfoData(
					element,
					false, // usedHint: only true when hint handler
					view[view.topicName].clozeGetInput, 
					view[view.topicName].clozeGetCorrectAnswer);
		}

		var $qParent = $(element).parents('.wertiviewQ').eq(0);
		var $input = $qParent.find('.wertiviewinput').eq(0);
	
		var currentText = $input.val();
		var targetText = $qParent.data('wertiview-target-text');

		currentText = view[view.topicName].compareFormat(currentText);
		targetText = view[view.topicName].compareFormat(targetText);
		
		if (currentText == targetText) {
			countsAsCorrect = true;
			$qParent.empty();
			$qParent.html($qParent.data('wertiview-original-text'));
			$qParent.addClass('clozeStyleCorrect');
		} else {
			$input.removeClass('clozeStyleInputUnknown');
			$input.addClass('clozeStyleInputIncorrect');
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
	 * Deals with the hint in the cloze activity.
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
					view[view.topicName].clozeGetInput, 
					view[view.topicName].clozeGetCorrectAnswer);
		}

		var $qParent = $(element).parents('.wertiviewQ').eq(0);
		
		$qParent.empty();
		$qParent.html($qParent.data('wertiview-original-text'));
		$qParent.addClass('clozeStyleProvided');
		
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
	 * Returns the input using the parameters.
	 * Used in the collectInfoData function.
	 */
	clozeGetInput: function(element, usedHint, isClick) {
		var $qParent = element.parents('.wertiviewQ');
		var $input = $qParent.find('.wertiviewinput');
		return $input.val();
	},

	/*
	 * Returns the correct answer using the paramters.
	 * Used in the collectInfoData function.
	 */
	clozeGetCorrectAnswer: function(element, usedHint) {
		var $qParent = element.parents('.wertiviewQ');
		return $qParent.data('wertiview-target-text');
	},
	
	/*
	 * Clears the input field.
	 */
	cearHandler: function(event) {
		var $qParent = $(this).parents('.wertiviewQ').eq(0);
		var $input = $qParent.find('.wertiviewinput').eq(0);
		
		$input.val('');
		$input.removeClass('clozeStyleInputIncorrect');
		$input.addClass('clozeStyleInputUnknown');
		
		$input.trigger('keyup');
		
		return false;
	},

	/*
	 * Adjust the width of the input field
	 */
	widthHandler: function(event) {		
		var minWidth = 50;
		var maxWidth = 500;
		var extraWidth = 20;
		
		$hiddenDiv = $('<div/>').css({
			  'position': 'absolute',
			  'top': '0',
			  'left': '0',
			  'visibility': 'hidden',
			  'fontSize': $(this).css('fontSize'),
			  'fontFamily': $(this).css('fontFamily'),
			  'fontWeight': $(this).css('fontWeight'),
			  'letterSpacing': $(this).css('letterSpacing'),
			  'whiteSpace': 'nowrap'});
		
		$hiddenDiv.text($(this).val());
		$hiddenDiv.insertAfter($(this));
		var hiddenWidth = $hiddenDiv.width();
		$hiddenDiv.remove();
		
		var newWidth = hiddenWidth;
		
		if (hiddenWidth < minWidth) {
			newWidth = minWidth;
		}
		
		if (hiddenWidth > maxWidth) {
			newWidth = maxWidth;
		}
		
		newWidth += extraWidth;
		
		$(this).width(newWidth);
	},

	compareFormat: function(text) {
		return text.toLowerCase().replace(/[^\w]/g, '');
	}
};