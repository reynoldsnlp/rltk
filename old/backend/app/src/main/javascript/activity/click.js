const $ = require('jquery');
const Enhancer = require('./TokenEnhancer');

const clickEnhancer = Enhancer(function($token) {
    $token.click(function(event) {
        if($token.find('span[data-view-enhancement]').size() > 0) {
            $token.addClass('view-correct-click');
        } else {
            $token.addClass('view-incorrect-click');
        }
    });
});

clickEnhancer.enhance();
