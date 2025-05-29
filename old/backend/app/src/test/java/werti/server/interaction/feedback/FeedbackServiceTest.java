package werti.server.interaction.feedback;

import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.interaction.H2TestDatabase;
import werti.server.interaction.authentication.TestAuthenticationService;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.*;
import static werti.server.interaction.feedback.FeedbackMessage.EXACT_MATCH;
import static werti.server.interaction.feedback.FeedbackMessage.NO_DIAGNOSIS;
import static werti.server.interaction.feedback.FeedbackMessage.PROVIDED_SOLUTION;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-23
 */
public class FeedbackServiceTest {
    private FeedbackRegistry feedbackRegistry;
    private StringMatcher stringMatcher;
    private FeedbackService feedbackService;
    private Task validTask;
    private FeedbackUtils feedbackUtils;
    private TrackingRequestData.Builder requestData;

    @Before
    public void setUp() throws Exception {
        feedbackRegistry = mock(FeedbackRegistry.class);
        stringMatcher = mock(StringMatcher.class);
        feedbackUtils = mock(FeedbackUtils.class);
        feedbackService = new FeedbackService(feedbackRegistry, feedbackUtils, stringMatcher);

        requestData = TrackingRequestData.builder()
                .authenticationToken("auth")
                .correctAnswer("correctAnswer")
                .enhancementId("enhancementId")
                .isCorrect(true)
                .sentence("The sentence")
                .submission("submission")
                .taskId(1)
                .timestamp(1)
                .usedSolution(false);

        User user = TestAuthenticationService.createTestUser();
        validTask = new H2TestDatabase().newRussianTaskFor(user);
    }

    @Test
    public void returnsProvidedSolutionFeedbackWhenSolutionIsProvided() throws Exception {
        final Feedback expected = Feedback.create(FeedbackMessage.PROVIDED_SOLUTION);
        when(feedbackUtils.produceFeedbackWithTemplate(PROVIDED_SOLUTION)).thenReturn(expected);
        final Feedback result = feedbackService.process(
                mock(Task.class),
                requestData.usedSolution(true).build()
        );

        assertThat(
                "Match expected feedback",
                result.feedbackMessage(),
                is(PROVIDED_SOLUTION)
        );
    }

    @Test
    public void returnsStringMatcherFeedbackFirst() throws Exception {
        final TrackingRequestData myRequestData = requestData.build();
        final Feedback feedback = Feedback.create(EXACT_MATCH);
        when(stringMatcher.getFeedback(
                myRequestData,
                validTask.language()
        )).thenReturn(Optional.of(feedback));

        final Feedback result = feedbackService.process(validTask, myRequestData);
        assertThat(
                "Expected feedback result from StringMatcher",
                result.feedbackMessage(),
                is(EXACT_MATCH)
        );
    }

    @Test
    public void returnsNoFeedbackIfNoEngineIsGivenForLanguage() throws Exception {
        when(stringMatcher.getFeedback(any(TrackingRequestData.class), any(Language.class)))
                .thenReturn(Optional.empty());
        when(feedbackRegistry.getEngineFor(any(Language.class)))
                .thenReturn(Optional.empty());

        final Feedback result = feedbackService.process(validTask, requestData.build());
        assertThat(
                "There should be no feedback",
                result.feedbackMessage(),
                is(NO_DIAGNOSIS)
        );
    }

    @Test
    public void returnsFeedbackFromEngine() throws Exception {
        when(stringMatcher.getFeedback(any(TrackingRequestData.class), any(Language.class)))
                .thenReturn(Optional.empty());
        final FeedbackEngine feedbackEngine = mock(FeedbackEngine.class);
        when(feedbackRegistry.getEngineFor(validTask.language()))
                .thenReturn(Optional.of(feedbackEngine));
        final Feedback expectedFeedback = Feedback.create(FeedbackMessage.EXACT_MATCH);
        when(feedbackEngine.getFeedbackFor(validTask, requestData.build()))
                .thenReturn(expectedFeedback);

        final Feedback result = feedbackService.process(validTask, requestData.build());

        assertThat(
                "Expected feedback should be returned",
                result.feedbackMessage(),
                is(EXACT_MATCH)
        );
    }
}
