wertiview.ns(function() {
	wertiview.rusassistivereading = {

	// maximum number of items in combobox in mc
	MAX_MC: 5,
	// actual number of items in combobox in mc (value is overridden below)
	maxLength: 5,
	
	// candidates for mc options presented to user
	types: [],
	hitList: [],
		
	remove: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;

		$('body').undelegate('span.wertiviewtoken', 'click');
		$('body').undelegate('select.wertiviewinput', 'change');
		$('body').undelegate('span.wertiviewhint', 'click');
		$('body').undelegate('input.wertiviewinput', 'change');
		$('body').undelegate('input.wertiviewhint', 'click');  // was: span.wertiviewhint
		$('body').undelegate('.show', 'click');
		$('body').undelegate('.hide', 'click');
		$('body').undelegate('.tableClick', 'click');
		
		$('.wertiviewinput').each( function() {
			$(this).replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		// replace the correct forms correctly answered by the user with the original text
		$('.clozeStyleCorrect').each( function() {
			$(this).replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		// replace the correct forms answered by the hint with the original text
		$('.clozeStyleProvided').each( function() {
			$(this).replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		// replace the correct forms with the original text
		$('.correctForm').each( function() {
			$(this).replaceWith($(this).data('wertivieworiginaltext'));
		});
		
		// remove the tooltips
		$('#tooltip-container').remove();
		
		$('span.wertiviewbaseform').remove();
		$('.wertiviewhint').remove();
		
		// remove the sidebar		
		$('#wertiview-sidebar').remove();
		
		// remove show/hide symbols
		$('.show').remove();
		$('.hide').remove();
		
		// change the display css attribute back
		$('body').css('display', '');
	},

	colorize: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;

		$('span.wertiviewhit').addClass('colorizeStyleRusAssistiveReading');
	},
	
	colorizeSpan: function(span, topic, index) {
		span.find('span.wertiviewhit').addClass('colorizeStyleRusAssistiveReading');
	},

	click: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;
		
		// exclude the tokens in instruction dialogs
		$('#wertiview-inst-notification span.wertiviewtoken').removeAttr('class');

		// change all wertiviewtoken spans to mouseover pointer
		$('span.wertiviewtoken').css({'cursor': 'pointer'}); 
		
		// handle click
		$('body').delegate('span.wertiviewtoken', 'click', {context: contextDoc}, wertiview.activity.getHandler(wertiview.rusassistivereading.clickHandler)); 
		
		// add the sidebar to the page
		if(!$('#wertiview-sidebar').length){
			wertiview.sidebar.add(contextDoc);
		}	
		
		// add the plus and minus symbols to all hits
		var $hits = $('span.wertiviewhit');
		
		// create show sign (+)
		var $showSign = $('<span>');
		$showSign.addClass('show');
		$showSign.css('cursor', 'pointer');
		$showSign.html('&#x2295;');
		
		// create hide sign (-)
		var $hideSign = $('<span>');
		$hideSign.addClass('hide');
		$hideSign.css('cursor', 'pointer');
		$hideSign.html('&#x2296;');

		// for each hit add the +/- symbols
		$hits.each( function() {
			var spanID = $(this).parent().attr('id')+'-tooltip';
			
			var showID = 'show-' + spanID;
			
			var hideID = 'hide-' + spanID;
			
			// create show sign (+)
			$showSign.attr('id',showID);
			$showSign.hide();
			$(this).parent().after($showSign.prop('outerHTML'));
			
			// create hide sign (-)
			$hideSign.attr('id',hideID);
			$hideSign.hide();
			$(this).parent().after($hideSign.prop('outerHTML'));
		});

		// enable click on the show sign
		$('body').delegate('.show', 'click', {context: contextDoc}, function(e){
			var spanID = $(this).attr('id').substring(5);
			$('#'+spanID).css({opacity:0.92, display:'none'}).fadeIn(400);
			$('#'+spanID).css({left:e.pageX+15, top:e.pageY+15});
			$('#show-'+spanID).toggle();
			$('#hide-'+spanID).toggle();
//			var $tooltip = $('.tooltip');
//			
//			if($tooltip.css('display') == 'block') {
//				$(document).click(function() {
//					alert('document was clicked');
//					var spanID = $tooltip.attr('id');
//					$('#'+spanID).fadeOut(400);
//					$('#show-'+spanID).toggle();
//					$('#hide-'+spanID).toggle();
//				});
//				
//				$tooltip.click(function(e) {
//					alert('tooltip was clicked');
//				    e.stopPropagation(); // This is the preferred method.
//				    return false;        // This should not be used unless you do not want
//				                          any click events registering inside the div
//				});				
//			}	
		});
		
		// enable click on the hide sign
		$('body').delegate('.hide', 'click', {context: contextDoc}, function(){
			var spanID = $(this).attr('id').substring(5);
			$('#'+spanID).fadeOut(400);
			$('#show-'+spanID).toggle();
			$('#hide-'+spanID).toggle();
		});		

//		// enable click on any element other than tooltip
//		$('body').delegate(':not(.tooltip)', 'click', {context: contextDoc}, function(){
//			if( $('.tooltip').css('display') == 'block') {
//			var $tooltip = $('.tooltip[display="block"]');
//			alert('opened tooltip id='+$tooltip.attr('id'));
//				var spanID = $tooltip.attr('id').substring(5);
//				alert('spanID');
//				$tooltip.fadeOut(400);
//				$('#show-'+spanID).toggle();
//				$('#hide-'+spanID).toggle();
//			}
//		});
		
		var $tooltipcontainer = $('<div id="tooltip-container">');
		
		$('body').append($tooltipcontainer);

		// enable click event on the tooltip tables
		$('#tooltip-container').delegate('.tableClick', 'click', {context: contextDoc}, function(){
			 var $table =  $(this).next();
		     // hide/show the table
		     $table.toggle();  
		});
	},

	clickHandler: function(element, event) {
		var contextDoc = event.data.context;

		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;
		
		var countsAsCorrect = false;
		if($(element).hasClass('wertiviewhit')) {  // was: wertiviewhit
			countsAsCorrect = true;
			
			// change the style of the previously visited element
			$('.visited').css('background-color','#FFFFCC');
			
			// add the current style to the current element
			$(element).addClass('visited');	
			$(element).css('background-color','#FFFF66');
			
			// tooltip inspired by http://www.kriesi.at/archives/create-simple-tooltips-with-css-and-jquery

//			if(!$('#wertiview-assistive-notification').length){
//				wertiview.notification.assistiveDialog(element, contextDoc);				
//			}
			
			// tooltip inspired by http://www.kriesi.at/archives/create-simple-tooltips-with-css-and-jquery
			
			var spanID = $(element).parent().attr('id')+'-tooltip';
			var $tooltip = $('#'+spanID);

			$('.tooltip').hide();
			$('.show').hide();
			$('.hide').hide();
			
			// tooltip was already created
			if($tooltip.length){
				wertiview.sidebar.addElement(element, contextDoc);	
			}
			// create new tooltip
			else{			
				var $table = $($(element).attr('paradigms'));
				$table.find('td').css('padding', '2px');
				$table.find('span.disambiguated').css({'font-weight': 'bold', 'background-color': '#666600'});
				// change all tableClick spans to mouseover pointer
				$table.find('.tableClick').css({'color': '#fff', 'background-color': '#222','cursor': 'pointer'}); 
				
				// translation link
				$table.find('div[lemma]').each(function(){
					var $link = $('<a href="#">');
					var lemma = $(this).attr('lemma');
					$link.text('more...');
					$link.css('color','#A1A1FF').css('text-decoration', 'underline');
					$link.attr('onclick', 'window.open("http://www.multitran.ru/c/m.exe?l1=2&l2=1&s=' + lemma+'");return false;');
					$(this).find('.translations').append(' ').append($link);
		        });
				
				var stylesOuter = {
					    position:'absolute',
					    zIndex:'999',
					    left:'-9999px',
					    backgroundColor:'#dedede',
					    padding:'5px',
					    border:'1px solid #fff'
				};
				
				var stylesInner = {
					    margin:'0',
					    padding:'0',
					    color:'#fff',
					    backgroundColor:'#222',
					    padding:'2px 7px'
				};
				
				var name = 'tooltip';
				$tooltip = $('<div>');
				$tooltip.addClass(name);
				$tooltip.attr('id', spanID);
				var $content = $('<p>');
				$content.html($table.html());
				$content.css(stylesInner);
				$tooltip.html($content);
				$tooltip.css(stylesOuter);
				//$('body').append($tooltip);
				$('#tooltip-container').append($tooltip);
				// creating ruled out readings
				var $ruledOutReadings = $(element).attr('ruledOutReadings');
				if($ruledOutReadings){
					$ruledOutReadingsDiv = $('<div>');
					var readings = $ruledOutReadings.split("#");
					var j = 0;
					while (j < readings.length) {
			            if (readings[j] != "") 
			            {
			            	if(j === 0){
			            		$ruledOutReadingsDiv.append('The following readings were ruled out by the system:<br>');
			            	}
			            	$ruledOutReadingsDiv.append(readings[j] +'<br>'); 
			            }
						j++;
					}
					$tooltip.append($ruledOutReadingsDiv);
				}
				
				// update the current element
				$(element).attr('paradigms', $table.prop('outerHTML'));
				
				// sidebar appears here, inspired by http://codepen.io/istrasoft/pen/unKsl/
				wertiview.sidebar.addElement(element, contextDoc);	
				$('#show-'+spanID).click();
				$('#hide-'+spanID).click();		
			}

			$('#show-'+spanID).show();									
		} else {
			// do nothing
		} 
		
		return countsAsCorrect;
	},
	
//	showTooltip: function(e){
//		alert('Clicked show');
//		$tooltip.css({opacity:0.8, display:'none'}).fadeIn(400);
//		$tooltip.css({left:e.pageX+15, top:e.pageY+15});
//		$showSign.toggle();
//		$hideSign.toggle();
//	},
//	
//	hideTooltip: function(e){
//		alert('Clicked hide');
//		$tooltip.fadeOut(400);
//		$showSign.toggle();
//		$hideSign.toggle();
//	},
	
	mc: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;
		
		// get potential spans
		var $hits = $('span.wertiviewhit');
		
		var hitList = [];
		var tokens = [];
		wertiview.rusassistivereading.types = [];
		//alert($hits.length+" hits");
		$hits.each( function() {
			hitList.push($(this));
			//alert($(this).text());
			tokens[$(this).text().toLowerCase()] = 1;
		});

		wertiview.rusassistivereading.maxLength = wertiview.rusassistivereading.MAX_MC;
		wertiview.activity.mc(contextDoc, hitList, 
				wertiview.rusassistivereading.clozeInputHandler, 
				wertiview.rusassistivereading.clozeHintHandler, 
				wertiview.rusassistivereading.mcGetOptions, 
				wertiview.rusassistivereading.mcGetCorrectAnswer);
	},
	
	mcGetOptions: function($hit, capType){
		var options = [];
		var j = 0;
		// Get the list of distractors for the given hit (they are saved as a space-separated list in the attribute "distractors" of the wertiview span tag):
		wertiview.rusassistivereading.types = $hit.attr('distractors').split(" ");
	    wertiview.lib.shuffleList(wertiview.rusassistivereading.types);
        
        // Add the distractor forms to the options list:
        while (j < wertiview.rusassistivereading.types.length && options.length < wertiview.rusassistivereading.MAX_MC - 1) {
            // The forms that are homonymous to the correct form are excluded from the list of options:
            if (wertiview.rusassistivereading.types[j].toLowerCase() != $hit.attr('correctForm').toLowerCase() && wertiview.rusassistivereading.types[j] != "") 
            {
               options.push(wertiview.lib.matchCapitalization(wertiview.rusassistivereading.types[j], capType)); 
            }
			j++;
		}
		
		options.push(wertiview.lib.matchCapitalization($hit.attr('correctForm'), capType));
		wertiview.lib.shuffleList(options);
		return options;
	},
	
	mcGetCorrectAnswer: function($hit, capType){
		return wertiview.lib.matchCapitalization($hit.attr('correctForm'), capType);
	},
	
	cloze: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ 
			return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			};
		$.fn = $.prototype = jQuery.fn;
		
		// get potential spans
		var $hits = $('span.wertiviewhit');

		var hitList = [];
		$hits.each( function() {
			hitList.push($(this));				
		}); 
		
		wertiview.activity.cloze(contextDoc, hitList, 
				wertiview.rusassistivereading.clozeInputHandler, 
				wertiview.rusassistivereading.clozeHintHandler, 
				wertiview.rusassistivereading.mcGetCorrectAnswer,
				wertiview.rusassistivereading.clozeAddBaseform);
	},
	
	clozeAddBaseform: function($hit, capType, $){
		// create baseform info
		var $baseform = $('<span>');
		$baseform.addClass('clozeStyleBaseform');
		$baseform.addClass('wertiviewbaseform');
		var lemmaform = $hit.attr('lemma');
		if (lemmaform)
		  $baseform.text(' (' + lemmaform + ')');
		  $hit.append($baseform);
	},

	clozeInputHandler: function(element, event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
		  var $ = function(selector,context){ 
			  return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			  };
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
			// save the original text in a hidden field
			$text.data('wertivieworiginaltext', $(element).data('wertivieworiginaltext'));
			if($(element).data('wertiviewnexthit')) {   
				nextInput = $(element).data('wertiviewnexthit');
			}
			wertiview.lib.replaceInput($(element).parent(), $text);

		} else {
			$(element).addClass('clozeStyleIncorrect');
		}
		return countsAsCorrect;
	},

	clozeHintHandler: function(element, event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
		  var $ = function(selector,context){ 
			  return new jQuery.fn.init(selector,contextDoc||window.content.document); 
			  };
		  $.fn = $.prototype = jQuery.fn;

		var nextInput;

		// fill in the answer by replacing input with text
		$text = $("<span>");
		$text.addClass('wertiview');
		$text.addClass('clozeStyleProvided');
		$text.text($(element).prev().data('wertiviewanswer'));
		// save the original text in a hidden field
		$text.data('wertivieworiginaltext', $(element).prev().data('wertivieworiginaltext'));
		if($(element).prev().data('wertiviewnexthit')) {  
			nextInput = $(element).prev().data('wertiviewnexthit');
		}
		wertiview.lib.replaceInput($(element).parent(), $text);
	}
	};
}); // REMOVE-WITH-MAVEN-REPLACER-PLUGIN