view.notification = {
	/*
	 * Create and add a notification dialog which lasts
	 * for some time and then removes itself.
	 */
	add: function(notice) {	
		var noticeTimeout = 3000; // in ms

		// create divs for popup notice
		var $noticediv = $("<div>");
		$noticediv.attr("id", "wertiview-notification");
		
		var $messagediv = $("<div>");
		$messagediv.attr("id", "wertiview-notification-message");

		// add message text to div
		$messagediv.text(notice);

		$noticediv.append($messagediv);

		// add to page
		$("body").append($noticediv);

		// show/hide message with timeout below
		$("#wertiview-notification").show("600", function() {
			$("#wertiview-notification-message").show("200");
		}).delay(noticeTimeout);
		
		view.notification.remove();
	},

	/*
	 * The notification dialog gets removed.
	 */
	remove: function() {
		$("#wertiview-notification-message").hide("fast");
		$("#wertiview-notification").hide("fast", function() {
			$("#wertiview-notification").remove();
		});
	},

	addInst: function(notice, isAvoidable) {

		// create divs for popup notice
		var $noticediv = $("<div>");
		$noticediv.attr("id", "wertiview-inst-notification");
		
		var $messagediv = $("<div>");
		$messagediv.attr("id", "wertiview-inst-message");
		$messagediv.html(notice);
		
		var $clickokdiv = $("<div>");
		$clickokdiv.attr("id", "wertiview-inst-click-ok");
		$clickokdiv.text("OK");		
		
		var noticeHeight = 80;
		var noticeWidth = 400;

		$noticediv.css({
			"min-height": noticeHeight + "px",
			"width": noticeWidth + "px"});
		
		$noticediv.append($messagediv);
		$noticediv.append("<br>");
		
		var $buttondiv = $("<div>");
		$buttondiv.attr("id", "wertiview-inst-button");
		$buttondiv.append($clickokdiv);	
		
		if(isAvoidable){ // the user can prevent to let it show up each time
			var $checkdontagain = $("<input>");
			$checkdontagain.attr("id", "wertiview-inst-check-dontagain");
			$checkdontagain.attr("type", "checkbox");
			$checkdontagain.attr("name", "dontshowinst");
			$checkdontagain.attr("value", "dontshowthisagain");	
			
			$noticediv.append($checkdontagain);
			$noticediv.append("Don\'t show this again");
			$noticediv.append("<br>");
		} // otherwise do nothing
		
		$noticediv.append($buttondiv);

		// add to page and center
		$("body").append($noticediv);
		
		$noticediv.css({
			"top": ($(window).height() - noticeHeight) / 2,
			"left": ($(window).width() - noticeWidth) / 2
		});

		// show/hide message with timeout below
		$("#wertiview-inst-notification").show("50");	
		
		$("body").on("click", "#wertiview-inst-click-ok", view.notification.clickToRemoveInstNotification);		
	},

	clickToRemoveInstNotification: function(event) {		
		if($("#wertiview-inst-check-dontagain").is(":checked")){
			chrome.storage.local.set({
				showInst: false
			});
		}
	    
		$("#wertiview-inst-notification").hide(0, function() {
			$(this).remove();
		});
	}
};