package werti.server.interaction.feedback;

import werti.server.analysis.ViewRequestException;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.transfer.TrackingRequestData;

import javax.inject.Inject;
import java.util.Optional;

import static werti.server.interaction.feedback.FeedbackMessage.NO_DIAGNOSIS;
import static werti.server.interaction.feedback.FeedbackMessage.PROVIDED_SOLUTION;


/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public class FeedbackService {
    private final FeedbackRegistry feedbackRegistry;
    private final FeedbackUtils feedbackUtils;
    private final StringMatcher stringMatcher;

    @Inject
    public FeedbackService(
            final FeedbackRegistry feedbackRegistry,
            final FeedbackUtils feedbackUtils,
            final StringMatcher stringMatcher
    ) {
        this.feedbackRegistry = feedbackRegistry;
        this.feedbackUtils = feedbackUtils;
        this.stringMatcher = stringMatcher;
    }

    public Feedback process(
            final Task task,
            final TrackingRequestData requestData
    ) throws ViewRequestException {
        if (requestData.usedSolution()) {
            return feedbackUtils.produceFeedbackWithTemplate(PROVIDED_SOLUTION);
        }

        Optional<Feedback> stringMatcherFeedback = stringMatcher.getFeedback(
                requestData,
                task.language()
        );

        if (stringMatcherFeedback.isPresent()) {
            return stringMatcherFeedback.get();
        }

        Optional<FeedbackEngine> feedbackEngine = feedbackRegistry.getEngineFor(task.language());

        if (feedbackEngine.isPresent()) {
            return feedbackEngine.get().getFeedbackFor(task, requestData);
        }

        return Feedback.create(NO_DIAGNOSIS);
    }
}
