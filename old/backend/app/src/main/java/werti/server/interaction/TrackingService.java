package werti.server.interaction;

import com.google.inject.Inject;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.*;
import werti.server.interaction.storage.TrackingStorage;
import werti.server.interaction.storage.ViewStorageException;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Date;
import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
public class TrackingService {
    private final TaskService taskService;
    private final TrackingStorage trackingStorage;

    @Inject
    public TrackingService(
            TaskService taskService,
            TrackingStorage trackingStorage
    ) {
        this.taskService = taskService;
        this.trackingStorage = trackingStorage;
    }

    public TaskPerformance track(
            TrackingRequestData requestData,
            Task task,
            Feedback feedback,
            String feedbackMessage
    ) throws ViewRequestException {
        final Submission logEntry = newLogEntry(requestData, task, feedback, feedbackMessage);
        final TaskPerformance taskPerformance =
                newTaskPerformance(task, requestData, feedback);
        try {
            trackingStorage.updateProgress(logEntry, taskPerformance);
        } catch (ViewStorageException e) {
            throw new ViewRequestException(e);
        }

        return taskPerformance;
    }

    private Submission newLogEntry(
            final TrackingRequestData requestData,
            final Task task,
            final Feedback feedback,
            final String feedbackMessage
    ) {
        return Submission.builder()
                         .task(task)
                         .submission(requestData.submission())
                         .feedback(feedback.feedbackMessage())
                         .enhancementId(requestData.enhancementId())
                         .timestamp(new Date(requestData.timestamp()))
                         .feedbackText(feedbackMessage)
                         .build();
    }

    private TaskPerformance newTaskPerformance(
            final Task task,
            final TrackingRequestData requestData,
            final Feedback feedback
    ) throws ViewStorageException {
        final TaskPerformance.Builder newPerformance = TaskPerformance
                .builder()
                .enhancementId(requestData.enhancementId())
                .feedback(feedback.feedbackMessage())
                .numberOfTries(1)
                .correctAnswer(requestData.correctAnswer())
                .usedSolution(requestData.usedSolution())
                .sentence(requestData.sentence())
                .task(task);

        trackingStorage.getPerformance(task, requestData.enhancementId())
                .ifPresent(oldPerformance -> newPerformance
                        .numberOfTries(oldPerformance.numberOfTries() + 1)
                        .feedback(feedback.feedbackMessage())
                        .usedSolution(oldPerformance.usedSolution() || requestData.usedSolution())
                );

        return newPerformance.build();
    }

    public List<Submission> getTaskLogEntries(
            final Task task
    ) throws ViewRequestException {
        try {
            return trackingStorage.getTaskLogEntries(task);
        } catch (ViewStorageException e) {
            throw new ViewRequestException(e);
        }
    }

    public List<TaskPerformance> getPerformance(final int taskId, final User user) throws
            ViewRequestException {
        final Task task = taskService.getTaskForUser(taskId, user);
        return getPerformance(task);
    }

    List<TaskPerformance> getPerformance(final Task task) throws ViewRequestException {
        try {
            return trackingStorage.getAllPerformances(task);
        } catch (ViewStorageException e) {
            throw new ViewRequestException(e);
        }
    }
}
