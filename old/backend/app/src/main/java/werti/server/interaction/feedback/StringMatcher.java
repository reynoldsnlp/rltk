package werti.server.interaction.feedback;

import com.google.inject.Inject;
import werti.Language;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Locale;
import java.util.Optional;

import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 22.05.17
 */
public class StringMatcher {
    private final FeedbackUtils feedbackUtils;

    @Inject
    public StringMatcher(final FeedbackUtils feedbackUtils) {
        this.feedbackUtils = feedbackUtils;
    }

    Optional<Feedback> getFeedback(
            TrackingRequestData requestData,
            Language language
    ) {
        String submission = requestData.submission();
        String correctAnswer = requestData.correctAnswer();

        if (submission.equals(correctAnswer)) {
            if(requestData.isCorrect()){
                return Optional.of(feedbackUtils.produceFeedbackWithTemplate(EXACT_MATCH));
            }
            else if (language.equals(Language.RUSSIAN)){ // wrong click for Russian
                return Optional.empty();
            }
            else { // wrong click for other languages
                return Optional.of(feedbackUtils.produceFeedbackWithTemplate(WRONG_CLICK_BASIC));
            }
        }

        final Locale locale = language.getLocale();

        String lcSubmission = submission.toLowerCase(locale);
        String lcCorrectAnswer = correctAnswer.toLowerCase(locale);
        if (lcSubmission.equals(lcCorrectAnswer)) {
            return Optional.of(feedbackUtils.produceFeedbackWithTemplate(LOWERCASE_MATCH));
        }

        String regex = "\\s";
        String replacement = "";
        String noSpaceSubmission = submission.replaceAll(regex, replacement);
        String noSpaceCorrectAnswer = correctAnswer.replaceAll(regex, replacement);
        if (noSpaceCorrectAnswer.equals(noSpaceSubmission)) {
            return Optional.of(feedbackUtils.produceFeedbackWithTemplate(SPACE_MATCH));
        }

        return Optional.empty();
    }
}
