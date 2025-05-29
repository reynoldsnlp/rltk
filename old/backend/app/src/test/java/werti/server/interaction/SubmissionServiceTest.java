package werti.server.interaction;

import com.google.inject.util.Providers;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.TestMustache;
import werti.server.UimaTestService;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.SubmissionResponse;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.TaskPerformance;
import werti.server.interaction.feedback.*;
import werti.server.interaction.feedback.russian.*;
import werti.server.interaction.storage.StorageEngine;
import werti.server.interaction.transfer.TrackingRequestData;
import werti.uima.ConvenientCas;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static werti.server.interaction.feedback.FeedbackMessage.EXACT_MATCH;

/**
 * @author Eduard Schaf
 * @since 10.05.17
 */
public class SubmissionServiceTest {
    private StorageEngine storageEngine;
    private User user;
    private Task validTask;
    private SubmissionService submissionService;
    private TaskPerformance taskPerformance;
    private TrackingRequestData trackingRequestData;

    @Before
    public void setUp() throws Exception {
        final FeedbackUtils feedbackUtils = new FeedbackUtils();
        final UimaTestService uimaService = new UimaTestService();
        final ConvenientCas theCas = uimaService.provideCas(Language.RUSSIAN);
        final RusDiagnosisManager diagnosisManager = new RusDiagnosisManager(
                        new RusWordChoiceDiagnosis(feedbackUtils),
                        new RusWordFormDiagnosis(feedbackUtils),
                        new RusStemDiagnosis(feedbackUtils),
                        new RusSpellingDiagnosis(feedbackUtils)
                );
        FeedbackEngine engine = new RussianFeedbackEngine(
                        uimaService,
                        Providers.of(theCas),
                        feedbackUtils,
                        diagnosisManager
        );
        final FeedbackRegistry feedbackRegistry = new FeedbackRegistry(engine);
        FeedbackService feedbackService = new FeedbackService(
                feedbackRegistry,
                feedbackUtils,
                new StringMatcher(feedbackUtils)
        );

        final TaskService taskService = mock(TaskService.class);

        final H2TestDatabase testDb = new H2TestDatabase();
        storageEngine = testDb.getTestDatabase();
        TrackingService trackingService = new TrackingService(taskService, storageEngine.getTrackingStorage());

        int taskId = 999;
        Date timestamp = new Date(System.currentTimeMillis());
        String submission = "фонеме";
        String enhancementId = "enh.id";
        String correctAnswer = "фонеме";
        String sentence = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются аллофонами.";
        user = testDb.newUser();
        validTask = testDb.newRussianTaskFor(user);
        when(taskService.getTaskForUser(any(TrackingRequestData.class), any(User.class))).thenReturn(validTask);

        submissionService = new SubmissionService(
                taskService,
                trackingService,
                feedbackService,
                new TestMustache().getFeedbackMustache()
        );

        taskPerformance =
                TaskPerformance.create(
                        enhancementId,
                        validTask,
                        correctAnswer,
                        1,
                        false,
                        sentence,
                        EXACT_MATCH
                );

        trackingRequestData = TrackingRequestData
                .builder()
                .authenticationToken("auth")
                .correctAnswer(correctAnswer)
                .isCorrect(true)
                .usedSolution(false)
                .submission(submission)
                .taskId(taskId)
                .sentence(sentence)
                .timestamp(timestamp.getTime())
                .enhancementId(enhancementId)
                .build();
    }

    @After
    public void tearDown() throws Exception {
        storageEngine.close();
    }


    @Test
    public void acceptSubmission() throws Exception {
        SubmissionResponse result =
                submissionService.acceptSubmission(trackingRequestData, user);

        assertThat(
                "The result should be an exact match.",
                result.feedbackResponseData().assessment(),
                is("EXACT_MATCH")
        );
    }

    @Test
    public void getPerformance() throws Exception {
        submissionService.acceptSubmission(trackingRequestData, user);

        List<TaskPerformance> expected = Collections.singletonList(taskPerformance);

        List<TaskPerformance> result = submissionService.getPerformance(validTask);

        assertEquals(
                "The performance should be available after the submission " +
                        "was accepted.",
                expected,
                result
        );
    }
}
