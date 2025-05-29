wertiview.ns(function() {
	wertiview.nouncountability = {	

	//MAX_CLOZE: 25,
	MAX_MC: 5,
	
	remove: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		$('body').undelegate('span.wertiviewtoken', 'click');
		$('body').undelegate('select.wertiviewinput', 'change');
		$('body').undelegate('span.wertiviewhint', 'click');
		$('body').undelegate('input.wertiviewinput', 'change');
		$('body').undelegate('span.wertiviewhint', 'click');
		
		$('.wertiviewanswered').each( function() {
			$(this).replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		$('.wertiviewinput').each( function() {
			$(this).parent().replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		$('.wertiviewhint').remove();
	},

	colorize: function(contextDoc) {
		var jQuery = wertiview.jQuery;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;        
        
		var topic = $('body').data('wertiview-topic');

		$('span.wertiviewCOUNT').addClass('colorizeStyleCount');
		$('span.wertiviewNONCOUNT').addClass('colorizeStyleNoncount');
		$('span.wertiviewBOTH').addClass('colorizeStyleBoth');
	},
	
	colorizeSpan: function(span, topic, index) {	
		span.find('span.wertiviewCOUNT').addClass('colorizeStyleCount');
		span.find('span.wertiviewNONCOUNT').addClass('colorizeStyleNoncount');
		span.find('span.wertiviewBOTH').addClass('colorizeStyleBoth');
	},

	click: function(contextDoc) {
		var jQuery = wertiview.jQuery;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;

		// change all wertiviewtoken spans to mouseover pointer
		$('span.wertiviewtoken').css({'cursor': 'pointer'});

		// handle POS clicking
		$('body').delegate('span.wertiviewtoken', 'click', {context: contextDoc}, wertiview.activity.getHandler(wertiview.nouncountability.clickHandler));
	},

	clickHandler: function(element, event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;

        var countsAsCorrect = false;
		if($(element).hasClass('wertiviewNONCOUNT')) {
			countsAsCorrect = true;
			$(element).addClass('clickStyleCorrect');
		} else {
			$(element).addClass('clickStyleIncorrect');
		}
		
		$(element).css({'cursor': 'auto'});
		
		return countsAsCorrect;
	},
	
	mc: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;

		// get potential spans
		var $countHits = $('span.wertiviewCOUNT');
		var $noncountHits = $('span.wertiviewNONCOUNT');
		
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
		var noncountRatio = wertiview.getNoncountRatioDec();
		
		wertiview.activity.mc(contextDoc, noncountHitList, 
				wertiview.nouncountability.mcInputHandler, 
				wertiview.nouncountability.mcHintHandler, 
				wertiview.nouncountability.mcGetOptions, 
				wertiview.nouncountability.mcGetCorrectAnswer, 
				wertiview.nouncountability.mcColor, false, noncountRatio);
		wertiview.activity.mc(contextDoc, countHitList, 
				wertiview.nouncountability.mcInputHandler, 
				wertiview.nouncountability.mcHintHandler, 
				wertiview.nouncountability.mcGetOptions, 
				wertiview.nouncountability.mcGetCorrectAnswer, 
				wertiview.nouncountability.mcColor, false, 1-noncountRatio);
	},
	
	mcGetOptions: function($hit, capType){
		var types = ['count', 'noncount'];
		return types;
	},
	
	mcGetCorrectAnswer: function($hit, capType){
		if ($hit.hasClass('wertiviewCOUNT')) {
			return 'count';
		}
		else {
			return 'noncount';
		}
	},
	
	mcColor: function($hit, capType){
		$hit.append(' ');
		$hit.addClass('mcStyleHighlight');
	},
	
	mcInputHandler: function(element, event) {
		var contextDoc = event.data.context;
		
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		var nextInput;
		var countsAsCorrect = false;

		// if the answer is correct, turn into text, else color text within input
		if($(element).val().toLowerCase() == $(element).data('wertiviewanswer').toLowerCase()) {
			countsAsCorrect = true;
			$text = $('<span>');
			$text.addClass('wertiviewanswered');
			$text.data('wertivieworiginaltext', $(element).data('wertivieworiginaltext'));
			$text.addClass('clozeStyleCorrect');
			$text.text($(element).data('wertivieworiginaltext'));
			$answer = $('<span>');
			$answer.addClass('mcStyleAnswer');
			$answer.text(' (' + $(element).data('wertiviewanswer').toLowerCase() + ')');
			$text.append($answer);
			if($(element).data('wertiviewnexthit')) {
				nextInput = $(element).data('wertiviewnexthit');
			}
			wertiview.lib.replaceInput($(element).parent(), $text);

			/*// focus next input
			if(nextInput) {
				$("#" + nextInput).get(0).focus();
			}*/
		} else {
			$(element).addClass('clozeStyleIncorrect');
		}
		
		return countsAsCorrect;
	},

	mcHintHandler: function(element, event) {
		var contextDoc = event.data.context;
		
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		var nextInput;

		// fill in the answer by replacing input with text
		$text = $("<span>");
		$text.addClass('wertiviewanswered');
		$text.data('wertivieworiginaltext', $(element).prev().data('wertivieworiginaltext'));
		$text.addClass('clozeStyleProvided');
		$text.text($(element).prev().data('wertivieworiginaltext'));
		$answer = $('<span>');
		$answer.addClass('mcStyleAnswer');
		$answer.text(' (' + $(element).prev().data('wertiviewanswer').toLowerCase() + ')');
		$text.append($answer);
		if($(element).prev().data('wertiviewnexthit')) {
			nextInput = $(element).prev().data('wertiviewnexthit');
		}
		wertiview.lib.replaceInput($(element).parent(), $text);

		/*// focus next input
		if(nextInput && $("#" + nextInput).length == 1) {
			$("#" + nextInput).get(0).focus();
		}*/
	}
	
	/*,
	
	cloze: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;

		// get potential spans
		var $hits = $('span.wertiviewhit');
		
		//var maxCloze = wertiview.nouncountability.MAX_CLOZE;
		//if (maxCloze > $hits.length) {
		//	maxCloze = $hits.length;
		//}
		var numHits = $countHits.length + $noncountHits.length;
		// number of hits to turn into exercises
		var maxCloze = wertiview.getProportionOfExercisesDec() * numHits;
		
		var hitList = []; 
		$hits.each( function() {
			hitList.push($(this));				
		});
		
		wertiview.lib.shuffleList(hitList);
		
		for(i = 0; i < maxCloze; i++) {
			var $hit = hitList[i];
			
			// create input box
			var $input = $('<input>');
			$input.attr('type', 'text');
			$input.attr('id', $hit.attr('id') + '-input');
			$input.addClass('clozeStyleInput);
			$input.addClass('wertiviewinput');
			$input.data('wertiviewanswer', $hit.text());
			$hit.empty();
			$hit.append($input);
			
			// create hint ? button
			var $hint = $('<input>');
			$hint.attr('id', $hit.attr('id') + '-hint');
			$hint.attr('type', 'image');
			$hint.attr('src', 'chrome://view/content/hint.jpg');
			$hint.addClass('clozeStyleHint);
			$hint.addClass('wertiviewhint');
			$hit.append($hint);
		}
		
		$('span.wertiviewhint').css({'cursor': 'auto'});
		
		// figure out next field
		var prevhit = null;
		var nexthits = {};
	
		$('input.wertiviewinput').each( function() {
			// keep track of links to next input field
			if (prevhit) {
				nexthits[prevhit] = $(this).attr('id');
			}
			prevhit = $(this).attr('id');
		});
		
		// add the next input info to each input field
		$('input.wertiviewinput').each( function() {
			if (nexthits[$(this).attr('id')]) {
				$(this).data('wertiviewnexthit', nexthits[$(this).attr('id')]);
			} else {
				$(this).data('wertiviewnexthit', null);
			}
		});

		$('body').delegate('input.wertiviewinput', 'change', {context: contextDoc}, wertiview.nouncountability.clozeInputHandler);
		$('body').delegate('span.wertiviewhint', 'click', {context: contextDoc}, wertiview.nouncountability.clozeHintHandler);
	},

	clozeInputHandler: function(element, event) {
		var contextDoc = event.data.context;

		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		var nextInput;
		var countsAsCorrect = false;

		// if the answer is correct, turn into text, else color text within input
		if($(element).val().toLowerCase() == $(element).data('wertiviewanswer').toLowerCase()) {
			countsAsCorrect = true;
			$text = $("<span>");
			$text.addClass('wertiview');
			$text.addClass('clozeStyleCorrect);
			$text.text($(element).data('wertiviewanswer'));
			if($(element).data('wertiviewnexthit')) {
				nextInput = $(element).data('wertiviewnexthit');
			}
			wertiview.lib.replaceInput($(element).parent(), $text);

			// focus next input
            //if(nextInput) {
            //            $("#" + nextInput).get(0).focus();
            //}
		} else {
			$(element).addClass('clozeStyleIncorrect);
		}

		return countsAsCorrect;
	},

	clozeHintHandler: function(element, event) {
		var contextDoc = event.data.context;

		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		var nextInput;

		// fill in the answer by replacing input with text
		$text = $("<span>");
		$text.addClass('wertiview');
		$text.addClass('clozeStyleProvided);
		$text.text($(element).prev().data('wertiviewanswer'));
		if($(element).prev().data('wertiviewnexthit')) {
			nextInput = $(element).prev().data('wertiviewnexthit');
		}
		wertiview.lib.replaceInput($(element).parent(), $text);

		// focus next input
        //if(nextInput && $("#" + nextInput).length == 1) {
        //        $("#" + nextInput).get(0).focus();
        //}
	}*/
	};
}); // REMOVE-WITH-MAVEN-REPLACER-PLUGIN
