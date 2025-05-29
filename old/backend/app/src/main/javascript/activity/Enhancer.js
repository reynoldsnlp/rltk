const $ = require('jquery') ;

module.exports = function(enhancementFunction) {
    return {
        spans: $('viewEnhancement'),

        enhance: function() {
            this.spans.each(function(index, span) {
                enhancementFunction($(span));
            });
        }
    };
};
