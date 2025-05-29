const $ = require('jquery');
const foundation = require('foundation-sites');

$(document).foundation();

function LanguageSelector() {
    this.createEvents = function() {
        const languageSelector = this;
        $('input[name=language]').change(function(event) {
            languageSelector.selectLanguage(event.target.value);
        });
    };

    this.topics = $('ul[id^="topics-for-"]');

    this.selectLanguage = function(language) {
        this.topics.each(function(index, topic) {
            console.log("Topic id: ", topic.id);
            if (topic.id === "topics-for-" + language) {
                $(topic).show();
            } else {
                $(topic).hide();
            }
        });
    };
}

(new LanguageSelector()).createEvents();

function ActivityEngager() {
    this.urlIsPresent = function() {
        return $("#enhance-this").val().length > 0;
    };

    this.showErrorMessage = function($button) {
        const $error = $("<span>");
        $error.addClass("alert");
        $error.addClass("callout");
        $error.text("Please specify a URL first");
        $error.hide().fadeIn(200);
        $button.after($error);
        setTimeout(function() {
            $error.fadeOut(200);
        }, 2000);
    };

    this.engageActivity = function(language, topic, activity, url) {
        const parameters = {
            lang: language,
            topic: topic,
            activity: activity,
            url: encodeURI(url)
        };
        window.location.href = "/view?" + $.param(parameters);
    };
    this.createEvents = function() {
        const activityEngager = this;
        $('button.activity-start').click(function(event) {
            if (activityEngager.urlIsPresent()) {
                activityEngager.engageActivity(
                    $(event.target).data('language'),
                    $(event.target).data('topic'),
                    $(event.target).data('activity'),
                    $('#enhance-this').val()
                );
            } else {
                activityEngager.showErrorMessage($(event.target));
            }
        });
    };
}

(new ActivityEngager()).createEvents();
