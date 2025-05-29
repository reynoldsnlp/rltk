const $ = require('jquery');
const Enhancer = require('./Enhancer');

const colorEnhancer = Enhancer(function($span) {
    $span.addClass('view-color-highlight');
});

colorEnhancer.enhance();
