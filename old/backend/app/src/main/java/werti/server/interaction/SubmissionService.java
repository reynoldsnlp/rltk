package werti.server.interaction;

import org.trimou.engine.MustacheEngine;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.*;
import werti.server.interaction.feedback.FeedbackService;
import werti.server.interaction.transfer.PerformanceResponseData;
import werti.server.interaction.transfer.TrackingRequestData;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public class SubmissionService {
    private final TaskService taskService;
    private final TrackingService trackingService;
    private final FeedbackService feedbackService;
    private final MustacheEngine mustacheEngine;

    @Inject
    public SubmissionService(
            final TaskService taskService,
            final TrackingService trackingService,
            final FeedbackService feedbackService,
            final @Named("feedback-mustache") MustacheEngine mustacheEngine
    ) {
        this.taskService = taskService;
        this.trackingService = trackingService;
        this.feedbackService = feedbackService;
        this.mustacheEngine = mustacheEngine;
    }

    public SubmissionResponse acceptSubmission(
            TrackingRequestData requestData,
            User user
    ) throws ViewRequestException{
        final Task task = taskService.getTaskForUser(requestData, user);

        final Feedback feedback = feedbackService.process(
                task,
                requestData
        );

        final FeedbackResponseData renderedFeedback =
                FeedbackResponseData.render(feedback, mustacheEngine);

        final TaskPerformance performance = trackingService.track(
                requestData,
                task,
                feedback,
                renderedFeedback.message()
        );

        return SubmissionResponse.create(
                PerformanceResponseData.create(performance),
                renderedFeedback
        );
    }

    public List<TaskPerformance> getPerformance(int taskId, User user) throws ViewRequestException {
        return trackingService.getPerformance(taskId, user);
    }

    List<TaskPerformance> getPerformance(final Task task) throws ViewRequestException {
        return trackingService.getPerformance(task);
    }
}
