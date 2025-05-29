/*
 * Restore previous option settings from storage and handle
 * active events of the option page.
 */
$(document).ready(function () {
	
	restoreUserOptions(); 
	
    $("#wertiview-fixed-number-of-exercises").on("click",function() {
    	$(this).next().show();
    	$("#wertiview-proportion-of-exercises-value").hide();
    });
    
    $("#wertiview-proportion-of-exercises").on("click",function() {
    	$(this).next().show();
    	$("#wertiview-fixed-number-of-exercises-value").hide();
    });
    
    $("#wertiview-random").on("click",function() {
    	$("#wertiview-first-offset-value").hide();
    	$("#wertiview-interval-size-value").hide();
    });
    
    $("#wertiview-first-offset").on("click",function() {
    	$(this).next().show();
    	$("#wertiview-interval-size-value").hide();
    });
    
    $("#wertiview-interval-size").on("click",function() {
    	$(this).next().show();
    	$("#wertiview-first-offset-value").hide();
    });
    
    $("#wertiview-save-options").on("click",function() {
    	console.log("click on save: call saveUserOptions()");
    	saveUserOptions();
    });
});

/*
 * Restore previous user option settings from storage.
 * The values right to "||" are default values.
 */
function restoreUserOptions() {		
	chrome.storage.local.get(["fixedOrPercentage",
	                          "fixedNumberOfExercises",
	                          "proportionOfExercises",
	                          "choiceMode",
	                          "firstOffset",
	                          "intervalSize",
	                          "showInst"], function (res) {
		
	    var fixedOrPercentageValue = res.fixedOrPercentage || 0;
	    var fixedNumberOfExercises = res.fixedNumberOfExercises || 25;
	    var proportionOfExercises = res.proportionOfExercises || 100;
	    var choiceModeValue = res.choiceMode || 0;
	    var firstOffset = res.firstOffset || 0;
	    var intervalSize = res.intervalSize || 1;
	    var showInst = res.showInst || false;
	    
	    // Choice between a fixed number or percentage of exercises
	    if (fixedOrPercentageValue == 0){
	    	$("#wertiview-fixed-number-of-exercises").prop("checked", true);
	    	$("#wertiview-fixed-number-of-exercises-value").show();
	    	$("#wertiview-proportion-of-exercises-value").hide();
	    }  else {
	    	$("#wertiview-proportion-of-exercises").prop("checked", true);
	    	$("#wertiview-proportion-of-exercises-value").show();
	    	$("#wertiview-fixed-number-of-exercises-value").hide();
	    };
	    
	    $("#wertiview-fixed-number-of-exercises-value").val(fixedNumberOfExercises);
	    
	    $("#wertiview-proportion-of-exercises-value").val(proportionOfExercises);
	    
	    // Choice how exercises should be chosen
	    if (choiceModeValue == 0){
	    	$("#wertiview-random").prop("checked", true);
	    } else if (choiceModeValue == 1){	    	
	    	$("#wertiview-first-offset").prop("checked", true);
	    	$("#wertiview-first-offset-value").show();
	    	$("#wertiview-interval-size-value").hide();
	    } else {
	    	$("#wertiview-interval-size").prop("checked", true);
	    	$("#wertiview-interval-size-value").show();
	    	$("#wertiview-first-offset-value").hide();
	    };	
	    
	    $("#wertiview-first-offset-value").val(firstOffset);
	    
	    $("#wertiview-interval-size-value").val(intervalSize);
	    
	    // Choice whether instructions should be showed or not
	    $("#wertiview-show-instructions").prop("checked", showInst);
	});
};

/*
 * Save all user option choices to the storage.
 */
function saveUserOptions() {
	chrome.storage.local.set({
		fixedOrPercentage: $("input[name='fixedOrPercentage']:checked").val(),
		fixedNumberOfExercises: $("#wertiview-fixed-number-of-exercises-value").val(),
		proportionOfExercises: $("#wertiview-proportion-of-exercises-value").val(),
		choiceMode: $("input[name='choiceMode']:checked").val(),
		firstOffset: $("#wertiview-first-offset-value").val(),
		intervalSize: $("#wertiview-interval-size-value").val(),
		showInst: $("#wertiview-show-instructions").prop("checked")
	});
};