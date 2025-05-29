const $ = require('jquery');
const Enhancer = require('./Enhancer');

const checkResult = function($input, $span, surface) {
    $span.empty();
    if ($input.val().trim().toLowerCase() === surface.toLowerCase()) {
        $span.addClass('view-correct-cloze');
    } else {
        $span.addClass('view-incorrect-cloze');
    }
    $span.text(surface);
};

viewLast = $('body');

const clozeEnhancer = Enhancer(function($span) {
    const surface = $span.text().trim();
    const $input = $('<input>');
    $span.empty();

    $input.data('view-prev', viewLast);
    viewLast.data('view-next', $input);
    viewLast = $input;

    $input.keydown(function(event) {
        if (event.key === "Enter" || event.key === "Tab") {
            $next = $input.data('view-next');
            if ($next !== undefined) {
                $next.focus();
                $prev = $input.data('view-prev');
                if ($prev !== undefined) {
                    $prev.data('view-next', $next);
                    $next.data('view-prev', $prev);
                }
            }
            checkResult($input, $span, surface);
        }
    });
    $span.append($input);
});

clozeEnhancer.enhance();
$('body').data('view-next').focus();
