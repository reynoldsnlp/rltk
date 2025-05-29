const $ = require('jquery') ;

module.exports = function(enhancementFunction) {
    return {
        tokens: $('viewToken'),

        enhance: function() {
            this.tokens.each(function(index, token) {
                enhancementFunction($(token));
            });
        }
    };
};
