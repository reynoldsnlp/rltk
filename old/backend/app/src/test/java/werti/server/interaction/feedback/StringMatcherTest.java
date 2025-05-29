package werti.server.interaction.feedback;

import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Optional;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public class StringMatcherTest {
    private StringMatcher stringMatcher;
    private TrackingRequestData.Builder requestData;

    @Before
    public void setup() throws Exception {
        final FeedbackUtils feedbackUtils = new FeedbackUtils();
        stringMatcher = new StringMatcher(feedbackUtils);
        requestData = TrackingRequestData.builder()
                .authenticationToken("auth")
                .enhancementId("enhancementId")
                .isCorrect(true)
                .sentence("The sentence")
                .taskId(1)
                .timestamp(1)
                .usedSolution(false);
    }

    @Test
    public void exactMatch() throws Exception {
        String submission = "Фоны";
        String correctAnswer = "Фоны";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.RUSSIAN
        );

        assertThat(
                "The feedback should be a message for an exact match.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.of(EXACT_MATCH))
        );
    }

    @Test
    public void exactMatchButIncorrect() throws Exception {
        String submission = "Фоны";
        String correctAnswer = "Фоны";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer)
                .isCorrect(false);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.RUSSIAN
        );

        assertThat(
                "The feedback should be empty.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.empty())
        );
    }

    @Test
    public void exactMatchButIncorrectWrongClickBasic() throws Exception {
        String submission = "test";
        String correctAnswer = "test";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer)
                .isCorrect(false);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.ENGLISH
        );

        assertThat(
                "The feedback should be a message for wrong click basic.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.of(WRONG_CLICK_BASIC))
        );
    }

    @Test
    public void lowercaseMatch() throws Exception {
        String submission = "фоны";
        String correctAnswer = "Фоны";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.RUSSIAN
        );

        assertThat(
                "The feedback should be a message for a lowercase match.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.of(LOWERCASE_MATCH))
        );
    }

    @Test
    public void spaceMatch() throws Exception {
        String submission = "Фо ны";
        String correctAnswer = "Фоны";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.RUSSIAN
        );

        assertThat(
                "The feedback should be a message for a space match.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.of(SPACE_MATCH))
        );
    }

    @Test
    public void emptyMatch() throws Exception {
        String submission = "Фон";
        String correctAnswer = "Фоны";

        requestData
                .submission(submission)
                .correctAnswer(correctAnswer);

        Optional<Feedback> resultFeedback = stringMatcher.getFeedback(
                requestData.build(),
                Language.RUSSIAN
        );

        assertThat(
                "The feedback should be empty.",
                resultFeedback.map(Feedback::feedbackMessage),
                is(Optional.empty())
        );
    }
}
