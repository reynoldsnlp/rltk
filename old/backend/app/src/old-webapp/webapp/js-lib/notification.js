
	wertiview.notification = {
	add: function(notice, contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		var noticeTimeout = 3000; // in ms

		// create divs for popup notice
		var $noticediv = jQuery("<div>");
		$noticediv.attr("id", "wertiview-notification");
		var $messagediv = jQuery("<div>");
		$messagediv.attr("id", "wertiview-notification-message");

		// add message text to div
		$messagediv.text(notice);

		$noticediv.css({'position': 'fixed',
			'bottom': '30px',
			'right': '30px',
			'min-height': '60px',
			'width': '300px',
			'background': '#333333',
			'-moz-border-radius': '5px',
			'border-radius': '5px',
			'border': '1px solid #999999',
			'z-index': '9999',
			'display': 'none'});
		$messagediv.css({'padding': '10px',
			'color': '#eeeeee',
			'display': 'block',
			'font-family': 'sans-serif',
			'font-size': '12pt',
			'position': 'relative',
			'text-align': 'left',
			'display': 'none'});

		$noticediv.append($messagediv);

		// add to page
		$('body').append($noticediv);

		// show/hide message with timeout below
		$('#wertiview-notification').show('600', function() {
			$('#wertiview-notification-message').show('200');
		});
		var timer = Components.classes["@mozilla.org/timer;1"]
					       .createInstance(Components.interfaces.nsITimer);
		var removeNotice = function() {
			$('#wertiview-notification-message').hide('fast');
			$('#wertiview-notification').hide('slow', function() {
				$('#wertiview-notification').remove();
			});
			timer.cancel();
		};
		timer.initWithCallback(removeNotice, noticeTimeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	},

	remove: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		$('#wertiview-notification-message').hide('fast');
		$('#wertiview-notification').hide('fast', function() {
			$('#wertiview-notification').remove();
		});
		
		$('#wertiview-inst-notification').remove();
	},
	
	instDialog: function(notice, contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;

		// create divs for popup notice
		var $noticediv = $('<div id="wertiview-inst-notification">');
		var $messagediv = $('<div id="wertiview-inst-message">' + notice + '</div>');
		var $clickokdiv = $('<div id="wertiview-inst-click-ok">OK</div>');
		var $checkdontagain = $('<input id="wertiview-inst-check-dontagain" type="checkbox" name="dontshowinst" value="dontshowthisagain">Don\'t show this again<br>');
		
		$noticediv.css({'position': 'fixed',
			'background': 'white',
			'-moz-border-radius': '5px',
			'border-radius': '5px',
			'border': '1px solid #999999',
			'z-index': '9999',
			'font-size' : '12pt',
			'padding' : '5px',
			'top' : '0px',
			'left' : '0px',
			'display': 'none'});
		
		$messagediv.css({'padding': '10px',
			'color': 'black',
			'display': 'block',
			'font-family': 'sans-serif',
			'font-size': '120%',
			'position': 'relative'});
		
		var buttonStyle = {'color': 'black',
				'display': 'inline',
				'font-family': 'sans-serif',
				'font-size': '100%',
				'position': 'relative',
				'margin' : 'auto',
				'width' : '50px',
				'padding': '1px',
				'background': 'lightgray',
				'-moz-border-radius': '5px',
				'border': '1px solid black',
				'text-align': 'center',
				'cursor': 'pointer'};
		
		$clickokdiv.css(buttonStyle);
		
		var noticeHeight = 80;
		var noticeWidth = 400;

		$noticediv.css({
			'min-height': noticeHeight + 'px',
			'width': noticeWidth + 'px'});
		
		$noticediv.append($messagediv);
		$noticediv.append('<br>');
		
		var $buttondiv = $('<div id="wertiview-inst-buttons">');
		$buttondiv.append($clickokdiv);
		
		$buttondiv.css('text-align', 'center');
		
		$checkdontagain.css('cursor', 'pointer');
		
		$noticediv.append($checkdontagain);
		$noticediv.append('<br>');
		$noticediv.append($buttondiv);

		wertiview.instoverlay.add(contextDoc, false, "0.5");

		// add to page and center
		$('body').append($noticediv);
		$noticediv.css({
			'top': ($('#wertiview-inst-overlay').height() - noticeHeight) / 2,
			'left': ($('#wertiview-inst-overlay').width() - noticeWidth) / 2
		});

		// show/hide message with timeout below
		$('#wertiview-inst-notification').show('50');
		
		//alert("jquery html notification=" + $('#wertiview-inst-notification').html());
		
		$('body').delegate('#wertiview-inst-click-ok', 'click', {context: contextDoc}, wertiview.notification.clickToRemove);		
	},
	
	clickToRemove: function(event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
		
		if($('#wertiview-inst-check-dontagain').is(':checked')){
			wertiview.disableInst();
		}
        
		$('#wertiview-inst-notification').hide(0, function() {
			$('#wertiview-inst-notification').remove();
		});
		
		wertiview.instoverlay.remove(contextDoc);
	},
	
	assistiveDialog: function(element, contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;      	
		
		var spanID = $(element).parent().attr('id')+'-tooltip';
		var $tooltip = $('#'+spanID);
		
		// create new tooltip
		if(!$tooltip.length){
			var $table = $($(element).attr('paradigms'));
			$table.find('td').css('padding', '2px');
			$table.find('span.disambiguated').css('font-weight', 'bold');
			// change all tableClick spans to mouseover pointer
			$table.find('.tableClick').css({'color': '#fff', 'background-color': '#222','cursor': 'pointer'}); 
			
			//$(element).each(function(i){ // just one element
			var name = 'tooltip';
			$tooltip = $('<div>');
			$tooltip.addClass(name);
			$tooltip.attr('id', spanID);
			$tooltip.html($table.html());
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
		}

		// create divs for popup notice
		var $noticediv = $('<div data-draggable="true" id="wertiview-assistive-notification">');
		var $messagediv = $('<div id="wertiview-inst-message">');
		var $clickxdiv = $('<div id="wertiview-assistive-click-x">X</div>');
		
		$noticediv.css({'position': 'fixed',
			'background': 'white',
			'-moz-border-radius': '5px',
			'border-radius': '5px',
			'border': '1px solid #999999',
			'z-index': '9999',
			'font-size' : '12pt',
			'padding' : '5px',
			'top' : '0px',
			'left' : '0px',
			'display': 'none'});
		
		$messagediv.css({'padding': '10px',
			'color': 'black',
			'display': 'block',
			'font-family': 'sans-serif',
			'font-size': '120%',
			'position': 'relative'});
		
		var buttonStyle = {'color': 'black',
				'display': 'inline',
				'font-family': 'sans-serif',
				'font-size': '100%',
				'position': 'relative',
				'margin' : 'auto',
				'width' : '50px',
				'padding': '1px',
				'background': 'lightgray',
				'-moz-border-radius': '5px',
				'border': '1px solid black',
				'text-align': 'center',
				'cursor': 'pointer'};
		
		
		
		$clickxdiv.css(buttonStyle);
		
		$messagediv.append($tooltip.html());
		
		$clickxdiv.css({'text-align': 'center', 'float': 'right'});	
		
		$noticediv.append($clickxdiv);	
		
		$noticediv.append('<br>');		
		
		$noticediv.append($messagediv);

		wertiview.instoverlay.add(contextDoc, false, "0.5");		

		// add to page and center		
		wertiview.notification.center($noticediv, contextDoc);

		$('body').append($noticediv);

		// show/hide message with timeout below
		$noticediv.show();
		
		//alert("jquery html notification=" + $('#wertiview-inst-notification').html());	     

		
		$('#wertiview-assistive-notification').delegate('#wertiview-assistive-click-x', 'click', {context: contextDoc}, wertiview.notification.clickXToRemove);		
		
		$('#wertiview-inst-message').delegate('.tableClick', 'click', {context: contextDoc}, wertiview.notification.tableClick);
		
		// make the notice dragable
		var $body = $('body');
	    var $target = null;

	    $body.on('mousedown', 'div', function(e) {
	       
	    	var $this = $(this);
	    	
	    	if($this.length){
//	    		alert($this.attr('id'));
		    	
	    		isDraggEnabled = $this.data('draggable');

		       	if (isDraggEnabled) {
		       		if(e.offsetX==undefined){
						x = e.pageX-$this.offset().left;
						y = e.pageY-$this.offset().top;
					}else{
						x = e.offsetX;
						y = e.offsetY;
					};

					$this.addClass('draggable');
		        	$body.addClass('noselect');
//		        	alert($this.attr('id'));
//		        	alert($(e.target).attr('id'));
		        	if($this.attr('id') === $(e.target).attr('id')){
			        	$target = $this;		        		
		        	}
		       	};
	    	}
	    });
	    
	     $body.on('mouseup', function(e) {
	        $target = null;
	        $body.find('.draggable').removeClass('draggable');
	        $body.removeClass('noselect');
	    });
	    
	     $body.on('mousemove', function(e) {
	        if ($target) {
	            $target.offset({
	                top: e.pageY  - y,
	                left: e.pageX - x
	            });
	        };     
	     });
	},
	
	clickXToRemove: function(event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
        
		$('#wertiview-assistive-notification').hide(0, function() {
			$('#wertiview-assistive-notification').remove();
		});
		
		wertiview.instoverlay.remove(contextDoc);
	},
	
	tableClick: function(event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
        
        var $table =  $(this).next();
        
        // hide/show the table
        $table.toggle();  

        // center the window according to the changed window size
        //wertiview.notification.center($('#wertiview-assistive-notification'), contextDoc);
	},
	
	center: function(elem, contextDoc) {
		var jQuery = wertiview.jQuery;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
        
		return elem.each(function(){
			var element = $(this), win = $(window);
			centerElement();

			$(window).bind('resize',function(){
				centerElement();
			});

			function centerElement(){
				var elementWidth, elementHeight, windowWidth, windowHeight, X2, Y2, maxHeight;
				elementWidth = element.outerWidth();
				elementHeight = element.outerHeight();
				windowWidth = win.width();
				windowHeight = win.height();	
				X2 = (windowWidth/2 - elementWidth/2) + "px";
				Y2 = (windowHeight/2 - elementHeight/2) + "px";
				maxHeight = windowHeight * 3/5;
				$(element).css({
					'left':X2,
					'top':Y2,
					'position':'fixed',
					'max-height' : maxHeight,
					'overflow' : 'auto'
				});						
			}
		});
	}
	};

