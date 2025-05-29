view.blur = {
	/*
	 * Blur the page with an overlay and  a loading
	 * image on top.
	 */
	add: function() {
		if($("wertiview-blur").length == 0) {		
			var $overlay = $("<div>");
			$overlay.attr("id", "wertiview-blur");
			
			$("body").append($overlay);
			
			var $loadingimg = $("<img>");
			$loadingimg.attr("id", "wertiview-blur-loading");
			$loadingimg.attr("src", chrome.extension.getURL("icons/loading.gif"));
			$loadingimg.attr("width", "32");
			$loadingimg.attr("height", "32");

			$("body").append($loadingimg);
			$loadingimg.css({
				"top": $overlay.height() / 2 - 16,
				"left": $overlay.width() / 2 - 16
			});
			$loadingimg.show();
		}
	},


	/*
	 * Remove the overlay and loading image that is blurring the page.
	 */
	remove: function() {
		$("#wertiview-blur-loading").remove();
		$("#wertiview-blur").remove();
	}	
};