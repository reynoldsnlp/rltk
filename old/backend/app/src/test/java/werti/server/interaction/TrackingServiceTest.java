package werti.server.interaction;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Submission;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.TaskPerformance;
import werti.server.interaction.storage.StorageEngine;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static werti.server.interaction.feedback.FeedbackMessage.WRONG_SPELLING;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class TrackingServiceTest {
    private int taskId;
    private TrackingService sut;
    private Task validTask;
    private Date timestamp;
    private String submission;
    private String enhancementId;
    private String correctAnswer;
    private Feedback feedback;

    private StorageEngine storageEngine;
    private String feedbackMessage;

    @Before
    public void setUp() throws Exception {
        final TaskService taskService = mock(TaskService.class);

        final H2TestDatabase testDb = new H2TestDatabase();
        storageEngine = testDb.getTestDatabase();
        sut = new TrackingService(taskService, storageEngine.getTrackingStorage());

        taskId = 999;
        timestamp = new Date(System.currentTimeMillis());
        submission = "sbmshn";
        enhancementId = "enh.id";
        correctAnswer = "answer";
        validTask = testDb.newTaskFor(testDb.newUser());
        when(taskService.getTaskForUser(any(TrackingRequestData.class), any(User.class))).thenReturn(validTask);
        feedback = Feedback.create(WRONG_SPELLING);
        feedbackMessage = "Some feedback";
    }

    @After
    public void tearDown() throws Exception {
        storageEngine.close();
    }

    @Test
    public void tracksPerformanceOnTwoDifferentEnhancementsInSameTask() throws Exception {
        final TrackingRequestData.Builder builder = TrackingRequestData
                .builder()
                .authenticationToken("auth")
                .correctAnswer(correctAnswer)
                .isCorrect(true)
                .usedSolution(true)
                .submission(submission)
                .taskId(taskId)
                .sentence(correctAnswer)
                .timestamp(timestamp.getTime());

        final TrackingRequestData request1 = builder.enhancementId("enhancement1").build();
        final TrackingRequestData request2 = builder.enhancementId("enhancement2").build();

        sut.track(request1, validTask, feedback, feedbackMessage);
        sut.track(request2, validTask, feedback, feedbackMessage);

        assertThat(
                "There should be two log entries",
                sut.getTaskLogEntries(validTask).size(),
                is(2)
        );

        final List<String> performanceIds =
                sut.getPerformance(validTask).stream()
                   .map(TaskPerformance::enhancementId).collect(Collectors.toList());

        assertThat(
                "There should be an entry for each enhancement id",
                performanceIds,
                contains("enhancement1", "enhancement2")
        );
    }

    @Test
    public void updatesPerformanceWhenMoreThanOneRequestIsMade() throws Exception {

        final TrackingRequestData.Builder requestDataBuilder = TrackingRequestData
                .builder()
                .authenticationToken("auth")
                .correctAnswer(correctAnswer)
                .enhancementId(enhancementId)
                .isCorrect(false)
                .usedSolution(false)
                .taskId(taskId)
                .timestamp(timestamp.getTime())
                .sentence(correctAnswer)
                .submission(submission);

        sut.track(requestDataBuilder.build(), validTask, feedback, feedbackMessage);

        assertThat(
                "Task performance should indicate one attempt",
                sut.getPerformance(validTask).get(0).numberOfTries(),
                is(1)
        );

        sut.track(requestDataBuilder.usedSolution(true).build(), validTask, feedback, feedbackMessage);

        assertThat(
                "Task performance with usedSolution(true)",
                sut.getPerformance(validTask).get(0).usedSolution(),
                is(true)
        );

        sut.track(requestDataBuilder.isCorrect(true).build(), validTask, feedback, feedbackMessage);

        assertThat(
                "Task performance with isCorrect(true)",
                sut.getPerformance(validTask).get(0).feedback(),
                is(feedback.feedbackMessage())
        );

        final Submission.Builder logBuilder = Submission
                .builder()
                .feedback(feedback.feedbackMessage())
                .enhancementId(enhancementId)
                .task(validTask)
                .timestamp(timestamp)
                .submission(submission)
                .feedbackText(feedbackMessage);

        assertThat(
                "There's a log of 3",
                sut.getTaskLogEntries(validTask),
                contains(
                        logBuilder.build(),
                        logBuilder.build(),
                        logBuilder.feedback(feedback.feedbackMessage()).build()
                )
        );
    }
}
