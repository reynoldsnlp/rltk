wertiview.ns(function() {
	wertiview.gerunds = {

	//MAX_CLOZE: 25,
	
	remove: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		$('body').undelegate('span.wertiviewtoken', 'click');
		$('body').undelegate('select.wertiviewinput', 'change');
		$('body').undelegate('span.wertiviewhint', 'click');
		$('body').undelegate('input.wertiviewinput', 'change');
		$('body').undelegate('span.wertiviewhint', 'click');
		
		$('.wertiviewinput').each( function() {
			$(this).replaceWith($(this).data('wertiviewanswer'));
		});
		$('span.wertiviewbaseform').remove();
		$('.wertiviewhint').remove();
	},

	colorize: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		$('span.wertiviewGER').addClass('colorizeStyleGER');
		$('span.wertiviewINF').addClass('colorizeStyleINF');
		$('span.wertiviewINFSPLIT').addClass('colorizeStyleINFSPLIT');
		$('span.wertiviewCLU-GERONLY, span.wertiviewCLU-INFONLY, span.wertiviewCLU-BOTHMEANSAME, span.wertiviewCLU-BOTHMEANDIFF, span.wertiviewCLU-FIXEDEXP').addClass('colorizeStyleCLU');
	},
	
	colorizeSpan: function(span, topic) {
		span.find('span.wertiviewGER').addClass('colorizeStyleGER');
		span.find('span.wertiviewINF').addClass('colorizeStyleINF');
		span.find('span.wertiviewINFSPLIT').addClass('colorizeStyleINFSPLIT');
		span.find('span.wertiviewCLU-GERONLY, span.wertiviewCLU-INFONLY, span.wertiviewCLU-BOTHMEANSAME, span.wertiviewCLU-BOTHMEANDIFF, span.wertiviewCLU-FIXEDEXP').addClass('colorizeStyleCLU');
	},

	click: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		// change all wertiviewtoken spans to mouseover pointer
		$('span.wertiviewtoken').css({'cursor': 'pointer'});

		// gerund and infinitive markup
		$('span.wertiviewRELEVANT').find('span.wertiviewGER').addClass('colorizeStyleGER');
		$('span.wertiviewRELEVANT').find('span.wertiviewINF').addClass('colorizeStyleINF');

		// correct cursor inside wertiviewtokens within multi-word spans
		$('span.wertiviewRELEVANT').find('span.wertiviewGER, span.wertiviewINF').css({'cursor': 'text'});
		$('span.wertiviewRELEVANT').find('span.wertiviewINF').children().css({'cursor': 'text'});

		// handle clue click
		$('body').delegate('span.wertiviewtoken', 'click', {context: contextDoc}, wertiview.activity.getHandler(wertiview.gerunds.clickHandler));
	},

	clickHandler: function(element, event) {
		var contextDoc = event.data.context;

		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		$(element).css({'cursor': 'auto'});

		var countsAsCorrect = false;
        
		if ($(element).parents('.wertiviewRELEVANT').length == 0) {
			// not within a relevant phrase
			$(element).addClass('clickStyleIncorrect');

		} else if ($(element).hasClass('wertiviewGER') ||
				$(element).hasClass('wertiviewINF') ||
				$(element).find('.wertiviewGER, .wertiviewINF').length > 0) {
			// an already colored gerund or infinitive

		} else if ($(element).hasClass('wertiviewCLU-BOTHMEANDIFF') ||
				$(element).hasClass('wertiviewCLU-BOTHMEANSAME') || 
				$(element).hasClass('wertiviewCLU-FIXEDEXP') ||
				$(element).hasClass('wertiviewCLU-GERONLY') || 
				$(element).hasClass('wertiviewCLU-INFONLY') || 
				$(element).find('.wertiviewCLU-BOTHMEANDIFF, .wertiviewCLU-BOTHMEANSAME, .wertiviewCLU-FIXEDEXP, .wertiviewCLU-GERONLY, .wertiviewCLU-INFONLY').length > 0) {
			countsAsCorrect = true;
			$(element).addClass('clickStyleCorrect');

		} else {
			$(element).addClass('clickStyleIncorrect');
		}
		return countsAsCorrect;
	},
	
	mc: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		// get potential spans
		var $hits = $('span.wertiviewRELEVANT').find('span.wertiviewGER,span.wertiviewINF');
		
		var hitList = []; 
		$hits.each( function() {
			// if this is a split infinitive, skip
			if ($(this).find('.wertiviewINFSPLIT').length == 0) {
				var options = $(this).attr('title').split(";");
				// if the infinitive or gerund isn't given in the markup, skip
				for (var j = 0; j < options.length; j++) {
					if (options[j] == 'null') {
						return;
					}
				}
				hitList.push($(this));				
			}
		});

		wertiview.activity.mc(contextDoc, hitList, 
				wertiview.gerunds.clozeInputHandler, 
				wertiview.gerunds.clozeHintHandler, 
				wertiview.gerunds.mcGetOptions, 
				wertiview.gerunds.mcGetCorrectAnswer);

	},
	
	mcGetOptions: function($hit, capType){
		var options = $hit.attr('title').split(";");
		return options;
	},
	
	mcGetCorrectAnswer: function($hit, capType){
		return $hit.text();
	},
	
	cloze: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		// get potential spans
		var $hits = $('span.wertiviewRELEVANT').find('span.wertiviewGER,span.wertiviewINF');

		var hitList = []; 
		$hits.each( function() {
			// if this is a split infinitive, skip
			if ($(this).find('.wertiviewINFSPLIT').length == 0) {
				hitList.push($(this));				
			}
		});

		wertiview.activity.cloze(contextDoc, hitList, 
				wertiview.gerunds.clozeInputHandler, 
				wertiview.gerunds.clozeHintHandler, 
				wertiview.gerunds.mcGetCorrectAnswer,
				wertiview.gerunds.clozeAddBaseform);
	},
	
	clozeAddBaseform: function($hit, capType, $){
		// create baseform info
		var $baseform = $('<span>');
		$baseform.addClass('clozeStyleBaseform');
		$baseform.addClass('wertiviewbaseform');
		var verbforms = $hit.attr('title').split(';');
		$baseform.text(' (' + verbforms[0] + ')');
		$hit.append($baseform);	
	},

	clozeInputHandler: function(element, event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
		  var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		  $.fn = $.prototype = jQuery.fn;

		var nextInput;
		var countsAsCorrect = false;

		// if the answer is correct, turn into text, else color text within input
		if($(element).val().toLowerCase() == $(element).data('wertiviewanswer').toLowerCase()) {
			countsAsCorrect = true;
			$text = $("<span>");
			$text.addClass('wertiview');
			$text.addClass('clozeStyleCorrect');
			$text.text($(element).data('wertiviewanswer'));
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

	clozeHintHandler: function(element, event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
		  var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		  $.fn = $.prototype = jQuery.fn;

		var nextInput;

		// fill in the answer by replacing input with text
		$text = $("<span>");
		$text.addClass('wertiview');
		$text.addClass('clozeStyleProvided');
		$text.text($(element).prev().data('wertiviewanswer'));
		if($(element).prev().data('wertiviewnexthit')) {
			nextInput = $(element).prev().data('wertiviewnexthit');
		}
		wertiview.lib.replaceInput($(element).parent(), $text);

		/*// focus next input
		if(nextInput) {
			$("#" + nextInput).get(0).focus();
		}*/
	}
	};
}); // REMOVE-WITH-MAVEN-REPLACER-PLUGIN
