view.rusassistivereading = {	
	/*
	 * Run the click activity.
	 * Ignore instruction dialogs.
	 * Add css attribute cursor: pointer to each span marked as token.
	 * Call the click handler when the span marked as token was clicked.
	 */
	click: function() {	
		console.log("click()");
		
		// exclude the tokens in instruction dialogs
		$("#wertiview-inst-notification span.wertiviewtoken").removeAttr("class");
	
		// change all wertiviewtoken spans to mouseover pointer
		$("span.wertiviewtoken").addClass("clickStylePointer");
	
		// handle click
		$("body").on("click", "span.wertiviewtoken", view[view.topicName].clickHandler); 
		
		// add the sidebar to the page
		if(!$("#wertiview-sidebar").length){
			view.sidebar.add();			
		}		
		
		// add the plus and minus symbols to all hits
		var $hits = $("span.wertiviewhit");
		
		// create show sign (+)
		var $showSign = $("<span>");
		$showSign.addClass("show");
		$showSign.html("&#x2295;");
		
		// create hide sign (-)
		var $hideSign = $("<span>");
		$hideSign.addClass("hide");
		$hideSign.html("&#x2296;");

		// for each hit add the +/- symbols
		$hits.each( function() {
			var spanID = $(this).parent().attr("id")+"-tooltip";
			
			var showID = "show-" + spanID;
			
			var hideID = "hide-" + spanID;
			
			// create show sign (+)
			$showSign.attr("id",showID);
			$showSign.hide();
			$(this).parent().after($showSign.prop("outerHTML"));
			
			// create hide sign (-)
			$hideSign.attr("id",hideID);
			$hideSign.hide();
			$(this).parent().after($hideSign.prop("outerHTML"));
		});

		// enable click on the show sign
		$("body").on("click", ".show", function(e){
			var spanID = $(this).attr("id").substring(5);
			$("#"+spanID).css({opacity:0.92, display:"none"}).fadeIn(400);
			$("#"+spanID).css({left:e.pageX+15, top:e.pageY+15});
			$("#show-"+spanID).toggle();
			$("#hide-"+spanID).toggle();
		});
		
		// enable click on the hide sign
		$("body").on("click", ".hide", function(){
			var spanID = $(this).attr("id").substring(5);
			$("#"+spanID).fadeOut(400);
			$("#show-"+spanID).toggle();
			$("#hide-"+spanID).toggle();
		});		
		
		var $tooltipcontainer = $("<div id='tooltip-container'>");
		
		$("body").append($tooltipcontainer);

		// enable click event on the tooltip tables
		$("#tooltip-container").on("click", ".tableClick", function(){
			 var $table =  $(this).next();
		     // hide/show the table
		     $table.toggle();  
		});
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
		$("body").off("click", ".show");
		$("body").off("click", ".hide");
		$("body").off("click", ".tableClick");
		
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
		
		// replace the correct forms with the original text
		$(".correctForm").each( function() {
			$(this).replaceWith($(this).data("wertivieworiginaltext"));
		});
		
		// remove the tooltips
		$("#tooltip-container").remove();
		
		$("span.wertiviewbaseform").remove();
		$(".wertiviewhint").remove();
		
		// remove the sidebar		
		$("#wertiview-sidebar").remove();
		
		// remove show/hide symbols
		$(".show").remove();
		$(".hide").remove();
	},
	
	/*
	 * Turn correctly clicked hits green and incorrect ones red
	 */
	clickHandler: function(event) {	
		var countsAsCorrect = false;
		var element = this;
		var infos = {};
		
		if($(element).hasClass("wertiviewhit")) {
			countsAsCorrect = true;
			
			// change the style of the previously visited element
			$(".visited").css("background-color","#FFFFCC");
			
			// add the current style to the current element
			$(element).addClass("visited");	
			$(element).css("background-color","#FFFF66");
			
			// tooltip inspired by http://www.kriesi.at/archives/create-simple-tooltips-with-css-and-jquery
			
			var spanID = $(element).parent().attr("id")+"-tooltip";
			var $tooltip = $("#"+spanID);

			$(".tooltip").hide();
			$(".show").hide();
			$(".hide").hide();
			
			// tooltip was already created
			if($tooltip.length){
				view.sidebar.addElement(element);	
			}
			// create new tooltip
			else{			
				var $table = $($(element).attr("paradigms"));
				
				// translation link
				$table.find("div[lemma]").each(function(){
					var $link = $("<a href='#'>");
					var lemma = $(this).attr("lemma");
					$link.text("more...");
					$link.attr("onclick", "window.open('http://www.multitran.ru/c/m.exe?l1=2&l2=1&s=" + lemma+"');return false;");
					$(this).find(".translations").append(" ").append($link);
		        });
				
				var name = "tooltip";
				$tooltip = $("<div>");
				$tooltip.addClass(name);
				$tooltip.attr("id", spanID);
				var $content = $("<p>");
				$content.html($table.html());
				$tooltip.html($content);
				$("#tooltip-container").append($tooltip);
				// creating ruled out readings
				var $ruledOutReadings = $(element).attr("ruledOutReadings");
				if($ruledOutReadings){
					$ruledOutReadingsDiv = $("<div>");
					var readings = $ruledOutReadings.split("#");
					var j = 0;
					while (j < readings.length) {
			            if (readings[j] != "") 
			            {
			            	if(j === 0){
			            		$ruledOutReadingsDiv.append("The following readings were ruled out by the system:<br>");
			            	}
			            	$ruledOutReadingsDiv.append(readings[j] +"<br>"); 
			            }
						j++;
					}
					$tooltip.append($ruledOutReadingsDiv);
				}
				
				// update the current element
				$(element).attr("paradigms", $table.prop("outerHTML"));
				
				// sidebar appears here, inspired by http://codepen.io/istrasoft/pen/unKsl/
				view.sidebar.addElement(element);	
				$("#show-"+spanID).click();
				$("#hide-"+spanID).click();		
			}

			$("#show-"+spanID).show();									
		} else {
			// do nothing
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
	}
};