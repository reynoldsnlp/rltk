package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.data.Activity;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.feedback.Levenshtein;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.RusStressAnnotator;
import werti.uima.ae.HFSTMalAnnotator;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 26.04.17
 */
public class RusDiagnosisManagerTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private Levenshtein lev;
    private RusDiagnosisManager diagnosisManager;

    @Before
    public void loadAEAndSetup() throws Exception {
        FeedbackUtils feedbackUtils = new FeedbackUtils();
        diagnosisManager = new RusDiagnosisManager(
                new RusWordChoiceDiagnosis(feedbackUtils),
                new RusWordFormDiagnosis(feedbackUtils),
                new RusStemDiagnosis(feedbackUtils),
                new RusSpellingDiagnosis(feedbackUtils)
        );
        uimaService = new UimaTestService();
        testPipe = createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTMalAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                ),
                createEngineDescription(RusStressAnnotator.class)
        );
        lev = new Levenshtein();
    }

    private ConvenientCas analyseWithFeedback(
            final String correctAnswerSentenceWithTags,
            final String submission
    ) throws Exception {
        return uimaService.analyseTextWithFeedback(
                correctAnswerSentenceWithTags,
                submission,
                testPipe,
                Language.RUSSIAN
        );
    }

    @Test
    public void wrongSpellingCloze() throws Exception {
        String correctAnswerSentenceWithTags =
                "Весной <viewenhancement>озеро</viewenhancement> холодное.";
        String submission = "азеро";
        String correctAnswer = "озеро";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        String[][] levMatrix = lev.createLevMatrix(submission, correctAnswer);
        String hintAnswer = lev.createHintAnswer(submission, levMatrix);

        Feedback expectedFeedback = Feedback.create(
                WRONG_SPELLING,
                ImmutableMap.of(
                        "hint-answer", hintAnswer,
                        "edit-distance", lev.getEditDistance(),
                        "spelling-correction", lev.getFirstHint(hintAnswer)
                )
        );

        Feedback resultFeedback = diagnosisManager.getBestFeedback(cas, getTaskWithActivity("cloze"));

        assertEquals(
                "The feedback should be a feedbackMessage for the wrong spelling.",
                expectedFeedback,
                resultFeedback
        );
    }

    private Task getTaskWithActivity(final String activity) {
        final Task task = mock(Task.class);
        when(task.activity()).thenReturn(mock(Activity.class));
        when(task.activity().activity()).thenReturn(activity);
        return task;
    }

    @Test
    public void wrongClick() throws Exception {
        String correctAnswerSentenceWithTags =
                "На берегу озера <viewenhancement>стоит</viewenhancement> дом.";
        String submission = "стоит";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                WRONG_CLICK,
                ImmutableMap.of("submission-pos", "verb")
        );

        Feedback resultFeedback = diagnosisManager.getBestFeedback(cas, getTaskWithActivity("click"));

        assertEquals(
                "The feedback should be a message for a wrong click.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongNumberAndCaseMc() throws Exception {
        String correctAnswerSentenceWithTags =
                "К <viewenhancement>дому</viewenhancement> подъехала машина.";
        String submission = "домах";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        String submissionNumber = "Plural";
        String correctAnswerNumber = "Singular";
        String submissionCase = "Locative";
        String correctAnswerCase = "Dative";

        Feedback expectedFeedback = Feedback.create(
                WRONG_NUMBER_AND_CASE,
                ImmutableMap.of(
                        "submission-number", submissionNumber,
                        "correct-answer-number", correctAnswerNumber,
                        "submission-case", submissionCase,
                        "correct-answer-case", correctAnswerCase
                )
        );

        Feedback resultFeedback = diagnosisManager.getBestFeedback(cas, getTaskWithActivity("mc"));

        assertEquals(
                "The feedback should be a message for a wrong number and case.",
                expectedFeedback,
                resultFeedback
        );
    }
}