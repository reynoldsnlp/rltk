package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import com.google.inject.util.Providers;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.data.Activity;
import werti.server.interaction.TaskService;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.feedback.FeedbackEngine;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.transfer.TrackingRequestData;
import werti.uima.ConvenientCas;

import java.util.Date;

import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static werti.server.interaction.feedback.FeedbackMessage.WRONG_LEMMA;
import static werti.server.interaction.feedback.FeedbackMessage.WRONG_SPELLING_UNSTRESSED_O;

/**
 * @author Eduard Schaf
 * @since 23.04.17
 */
public class RussianFeedbackEngineTest {
    private int taskId;
    private Task validTask;
    private Activity activity;
    private FeedbackEngine engine;
    private FeedbackUtils feedbackUtils;

    @Before
    public void setUp() throws Exception {
        feedbackUtils = new FeedbackUtils();
        final RusDiagnosisManager diagnosisManager = new RusDiagnosisManager(
                new RusWordChoiceDiagnosis(feedbackUtils),
                new RusWordFormDiagnosis(feedbackUtils),
                new RusStemDiagnosis(feedbackUtils),
                new RusSpellingDiagnosis(feedbackUtils)
        );
        final UimaTestService uimaService = new UimaTestService();
        final ConvenientCas theCas = uimaService.provideCas(Language.RUSSIAN);
        engine = new RussianFeedbackEngine(
                uimaService,
                Providers.of(theCas),
                feedbackUtils,
                diagnosisManager
        );
        taskId = 999;
        validTask = mock(Task.class);
        final TaskService taskService = mock(TaskService.class);
        when(taskService.getTaskForUser(
                any(TrackingRequestData.class),
                any(User.class)
        )).thenReturn(validTask);
        activity = mock(Activity.class);
        when(validTask.activity()).thenReturn(activity);
    }

    @Test
    public void wrongLemmaDefaultAnalysis() throws Exception {
        String submission = "муха";
        String correctAnswer = "окне";

        final TrackingRequestData.Builder builder = TrackingRequestData
                .builder()
                .authenticationToken("auth")
                .correctAnswer(correctAnswer)
                .sentence("На <viewenhancement>окне</viewenhancement> сидела муха.")
                .isCorrect(true)
                .usedSolution(false)
                .submission(submission)
                .taskId(taskId)
                .timestamp(new Date().getTime());
        final TrackingRequestData trackingRequestData =
                builder.enhancementId("enhancement1").build();

        when(activity.activity()).thenReturn("click");

        Feedback expected = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", submission)
        );

        Feedback result = engine.getFeedbackFor(
                validTask,
                trackingRequestData
        );

        assertEquals(
                "The feedback should be a feedbackMessage for a wrong lemma.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingUnstressedOFeedbackClozeAnalysis() throws Exception {
        String submission = "акне";
        String correctAnswer = "окне";

        final TrackingRequestData.Builder builder = TrackingRequestData
                .builder()
                .authenticationToken("auth")
                .correctAnswer(correctAnswer)
                .sentence("На <viewenhancement>окне</viewenhancement> сидела муха.")
                .isCorrect(true)
                .usedSolution(false)
                .submission(submission)
                .taskId(taskId)
                .timestamp(new Date().getTime());
        final TrackingRequestData trackingRequestData =
                builder.enhancementId("enhancement1").build();

        when(activity.activity()).thenReturn("cloze");

        Feedback expected = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_SPELLING_UNSTRESSED_O,
                ImmutableMap.of(
                        "vowel-count-at-confused-vowel", 1,
                        "vowel-count-at-stressed-vowel", 2
                )
        );

        Feedback result = engine.getFeedbackFor(
                validTask,
                trackingRequestData
        );

        assertEquals(
                "The feedback should be a feedbackMessage for a " +
                        "wrong spelling with unstressed o.",
                expected,
                result
        );
    }
}
