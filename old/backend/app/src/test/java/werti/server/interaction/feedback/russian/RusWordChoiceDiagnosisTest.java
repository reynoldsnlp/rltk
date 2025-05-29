package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.HFSTMalAnnotator;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 03.05.17
 */
public class RusWordChoiceDiagnosisTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RusWordChoiceDiagnosis rusWordChoiceDiagnosis;

    @Before
    public void loadAE() throws Exception {
        uimaService = new UimaTestService();
        testPipe = createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTMalAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                )
        );
        final FeedbackUtils feedbackUtils = new FeedbackUtils();
        rusWordChoiceDiagnosis = new RusWordChoiceDiagnosis(feedbackUtils);
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
    public void wrongLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "На берегу озера стоит <viewenhancement>дом</viewenhancement>.";
        String submission = "стул";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", submission)
        );

        Feedback resultFeedback = rusWordChoiceDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong lemma.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongPos() throws Exception {
        String correctAnswerSentenceWithTags =
                "На берегу озера стоит <viewenhancement>дом</viewenhancement>.";
        String submission = "синий";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                WRONG_POS,
                ImmutableMap.of("submission-pos", "Adjective")
        );

        Feedback resultFeedback = rusWordChoiceDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong pos.",
                expectedFeedback,
                resultFeedback
        );
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

        Feedback resultFeedback = rusWordChoiceDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong click.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisCorrectWordChoice() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас <viewenhancement>дома</viewenhancement> много цветов.";
        String submission = "дом";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusWordChoiceDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisNoLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "На берегу озера стоит <viewenhancement>дом</viewenhancement>.";
        String submission = "сту";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusWordChoiceDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }
}