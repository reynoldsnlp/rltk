
	wertiview.sidebar = {
	add: function(contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		var $body = $('body');
		// create the sidebar
		var $sidebardiv = $('<div id="wertiview-sidebar">');
		var $sidebarcontainerdiv = $('<div id="wertiview-sidebar-container">');
		var $splitbardiv = $('<div id="wertiview-split-bar">');	
		var $sidebartopdiv = $('<div id="wertiview-sidebar-top">');
		var $sidebarbottomdiv = $('<div id="wertiview-sidebar-bottom">');
		var $sidebartopbottomsplitdiv = $('<div id="wertiview-sidebar-top-bottom-split">');
		
		$sidebardiv.css({'background-color': 'AliceBlue',
			'float': 'left',
//			'max-width': '1000px',
			'font-family': 'Arial',
			'font-size':'16px',
			'margin-left': '5px'});	
		//($(window).height()*0.34)
		$sidebarcontainerdiv.css({'background-color': 'AliceBlue',
			'position': 'fixed',
//			'max-width': '1000px', 
			'height': '100%'});
		
		$splitbardiv.css({'background-color': 'black',				
			'width' : '6px',
			'height' : 'inherit',
			'float': 'right',
			'cursor': 'col-resize'});
		
		$sidebartopdiv.css({'background-color': 'AliceBlue',
			'height': '60%',
			'overflow': 'auto', 
			'margin-left': '5px'});
		
		
		$sidebartopbottomsplitdiv.css({'background-color': 'black',				
			'width' : '100%',
			'height' : '6px',
			'cursor': 'row-resize'});
		
		$sidebarbottomdiv.css({'overflow': 'auto',
			'height': '40%', 
			'margin-left': '5px'});

		var headerstyle = {'font-size':'20px',
			'height': '100%',
			'display': 'flex',
			'align-items': 'center',
			'justify-content': 'center'};
		
		var $sidebartopheader = $('<div id="wertiview-sidebar-top-header" class="header">');
		$sidebartopheader.text('grammar and translations');
		$sidebartopheader.css(headerstyle);
		
		var $sidebarbottomheader = $('<div id="wertiview-sidebar-bottom-header" class="header">');
		$sidebarbottomheader.text('history');
		$sidebarbottomheader.css(headerstyle)
		
		$sidebartopdiv.append($sidebartopheader);	
		
		$sidebarbottomdiv.append($sidebarbottomheader);
		
		$sidebardiv.append($splitbardiv);
		
		$sidebardiv.append($sidebarcontainerdiv);										
		
		$sidebarcontainerdiv.append($sidebartopdiv);
		
		$sidebarcontainerdiv.append($sidebartopbottomsplitdiv);
		
		$sidebarcontainerdiv.append($sidebarbottomdiv);							
		
		$body.prepend($sidebardiv);
		
		$sidebardiv.css('height', $sidebardiv.parent().css('height'));
	    
	    $body.css('display', '-moz-inline-box');
	    
		// split-bar adjustments
		var min = 100;
		var max = 1000;
		var bodymin = 200;
		
		$('#wertiview-split-bar').mousedown(function (e) {
		    e.preventDefault();
		    $(document).mousemove(function (e) {
		        e.preventDefault();
		        var x = e.pageX - $('#wertiview-sidebar').offset().left;
		        if (x > min && x < max && e.pageX < ($(window).width() - bodymin)) {  
		        	$('#wertiview-sidebar').css('width', x);
		        	$('#wertiview-sidebar-container').css('width', x-6);
		        }
		    });
		});
		
		$('#wertiview-sidebar-top-bottom-split').mousedown(function (e) {
		    e.preventDefault();
		    $(document).mousemove(function (e) {
		        e.preventDefault();
		        var y = e.pageY - $('#wertiview-sidebar-top').offset().top;
		        if (y > min && y < max && e.pageY < ($(window).height() - bodymin)) {  
		        	$('#wertiview-sidebar-top').css('height', y);
		        }
		    });
		});
		
		$(document).mouseup(function (e) {
		    $(document).unbind('mousemove');
		});
		
		// hide/show the item in the top sidebar on click
		$('#wertiview-sidebar-top').delegate('.tableClick', 'click', {context: contextDoc}, wertiview.sidebar.tableClick);		
    	
    	// update the top sidebar on click on items in the bottom sidebar
    	$('#wertiview-sidebar-bottom').delegate('div[id]', 'click', {context: contextDoc}, wertiview.sidebar.update);
    
		// adjust the sidebar size to the max header width
    	var maxHeaderWidth = $sidebartopheader.width() + 25;
    	$sidebardiv.css('width', maxHeaderWidth);
    	$sidebarcontainerdiv.css('width', maxHeaderWidth-6);
//        
//        // prevent that the user makes the sidebar smaller then the max header width
//        $sidebardiv.css('min-width', maxHeaderWidth);
//        $sidebarcontainerdiv.css('min-width', maxHeaderWidth-6);
	},
	
	addElement: function(element, contextDoc) {
		var jQuery = wertiview.jQuery;
		var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
		$.fn = $.prototype = jQuery.fn;
		
		// get the top of the sidebar
		var $sidebartop = $('#wertiview-sidebar-top');
		
		// get the bottom of the sidebar
		var $sidebarbottom = $('#wertiview-sidebar-bottom');
		
		// prepend the top sidebar content to the bottom sidebar
		var $lemmaInfosData = $sidebarbottom.data('lemmaInfos');
		
		// check if the data object is defined
		if (typeof $lemmaInfosData !== 'undefined'){
			// remove the bottom sidebar header, if there is still one
			var $sidebarbottomheader = $('#wertiview-sidebar-bottom-header');
			if($sidebarbottomheader.length){
				$sidebarbottomheader.remove();
			}
			// check if the element isn't already in the bottom sidebar
			$lemmaInfosData.children().each(function(){
				var elementId = $(this).attr('id');
				if(!$sidebarbottom.find('#'+elementId).length){
					$sidebarbottom.prepend($(this));				
				}
	        });
		}
		
		// extract the paradigm of the current element
		var $table = $($(element).attr('paradigms'));
		// change all tableClick spans to mouseover pointer, add background-color
		$table.find('.tableClick').css({'cursor': 'pointer',
			'background-color': 'lightgray'}); 
		
		// add background color to translations
		$table.find('.translations').css({'background-color': 'whitesmoke'}); 
		
		// remove background color from disambiguated forms
		$table.find('span.disambiguated').css('background-color', '');
		
		// find the paradigm(s) and create a minimal paradigm depending on pos
		var $paradigms = $table.find('.paradigm');
		
		// FSTUPDATE: full paradigms are reduced to small paradigms using FST features
		
		$paradigms.each(function(){
			// check paradigms according to their pos
			if($(this).hasClass('adjective')){
				// remove the rows of this paradigm except of the case, Nom, short and cmpar row
				$(this).find('tr:not(.Case, .Nom, .Short, .Cmpar)').remove();
			}
			else if($(this).hasClass('determiner') 
					|| $(this).hasClass('ordinalNumber')){
				// remove the rows of this paradigm except of the case and Nom row
				$(this).find('tr:not(.Case, .Nom)').remove();
			}
			else if($(this).hasClass('verbalAdverbs') 
					|| $(this).hasClass('verbParticiples')){
				// remove everything and the span before the paradigm
				$(this).prev('span').remove();
				$(this).remove();
			}
			else if($(this).hasClass('participle')){
				// remove everything
				$(this).remove();
			}
        });
		
		// create the lemma info element
		var $lemmaInfos = $('<div>');
		
		$table.find('div[lemma]').each(function(){
			var $lemmaInfo = $('<div>');
			var lemma = $(this).attr('lemma');
			$lemmaInfo.text(lemma);
			$lemmaInfo.attr('id', lemma);
			$lemmaInfo.data('lemmaInfo', $(this).prop('outerHTML'));
			$lemmaInfo.css('cursor', 'pointer'); 
			$lemmaInfos.append($lemmaInfo);
        });
		
		// we save the lemma info in a data object 
		$sidebarbottom.data('lemmaInfos', $lemmaInfos);
		
		// remove previous content in the top sidebar
		$sidebartop.empty();
		
		// fill the top sidebar with the table 
		$table.append('<br>');
		$sidebartop.append($table);	
		
		// adjust sidebar size
//    	wertiview.sidebar.adjustSidebarSize(contextDoc);  
	},
	
	update: function(event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
    	
		// get the top of the sidebar
		var $sidebartop = $('#wertiview-sidebar-top');
		
		// get the bottom of the sidebar
		var $sidebarbottom = $('#wertiview-sidebar-bottom');
		
		// prepend the top sidebar content to the bottom sidebar
		var $lemmaInfosData = $sidebarbottom.data('lemmaInfos');
		
		// check if the element isn't already in the bottom sidebar
		$lemmaInfosData.children().each(function(){
			var elementId = $(this).attr('id');
			if(!$sidebarbottom.find('#'+elementId).length){
				$sidebarbottom.prepend($(this));				
			}
        });

		// get the element the user clicked on
		var $element = $($(this).data('lemmaInfo'));
		
		// remove previous content in the top sidebar
		$sidebartop.empty();
		
		// fill the top sidebar with the element 
		$element.append('<br>');
		$sidebartop.append($element);	
		
		// adjust sidebar size
//    	wertiview.sidebar.adjustSidebarSize(contextDoc);  
	},
	
	
	
	tableClick: function(event) {
		var jQuery = wertiview.jQuery;
		var contextDoc = event.data.context;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;
        
        var $table =  $(this).next();
        
        // hide/show the table
        $table.toggle();        
        
        // adjust sidebar size
//        wertiview.sidebar.adjustSidebarSize(contextDoc);
	},
	
	adjustSidebarSize: function(contextDoc){
		var jQuery = wertiview.jQuery;
        var $ = function(selector,context){ return new jQuery.fn.init(selector,contextDoc||window.content.document); };
        $.fn = $.prototype = jQuery.fn;   
        
        var $sidebar = $('#wertiview-sidebar');	
        
        var $sidebarcontainer = $('#wertiview-sidebar-container');

		// expand the sidebar width to its maximum
        $sidebar.css('width', '500px');
        $sidebarcontainer.css('width', '494px');
        
		// get all spans with the class tableClick
        var $tables = $sidebarcontainer.find('.tableClick');
        
        var maxTableWidth = 0;
        
        // find the greatest table width
        $tables.each(function(){
//        	alert($(this).attr('class'));
        	// both the table click, and table width + a little puffer
        	var curTableClickWidth = $(this).width() + 25;
        	var curTableWidth = $(this).next().find('.paradigm').width() + 25;
//        	alert('curTableClickWidth='+curTableClickWidth + '\ncurTableWidth=' + curTableWidth);
        	// if one of the table's tableClick span's width is bigger than the previous one, assign it
        	if(maxTableWidth < curTableClickWidth){
        		maxTableWidth = curTableClickWidth;
        	}
        	// if one of the table's width is bigger than the previous one, assign it
        	if(maxTableWidth < curTableWidth){
        		maxTableWidth = curTableWidth;
        	}
        });
        
//        alert('maxTableWidth='+maxTableWidth);
        
//        alert('$sidebar.width()='+$sidebar.width());
        
        // adjust the sidebar size to the max table width
        $sidebar.css('width', maxTableWidth);
        $sidebarcontainer.css('width', maxTableWidth-6);
        
        // prevent that the user makes the sidebar smaller then the max table width
        $sidebar.css('min-width', maxTableWidth);
        $sidebarcontainer.css('min-width', maxTableWidth-6);
	}
	};

