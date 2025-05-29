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
public class RusStemDiagnosisTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RusStemDiagnosis rusStemDiagnosis;

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
        rusStemDiagnosis = new RusStemDiagnosis(feedbackUtils);
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
    public void noPalatalization() throws Exception {
        String correctAnswerSentenceWithTags =
                "Дождя не было, но <viewenhancement>земля</viewenhancement> " +
                "на рассвете стала влажной.";
        String submission = "земла";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                NO_PALATALIZATION,
                ImmutableMap.of("soft-consonant-position", 4)
        );

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no palatalization.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void extraFleetingVowel() throws Exception {
        String correctAnswerSentenceWithTags =
                "Спросили бы, как делали <viewenhancement>отцы</viewenhancement>.";
        String submission = "отецы";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                EXTRA_FLEETING_VOWEL,
                ImmutableMap.of("fleeting-vowel-position", 3)
        );

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for an extra fleeting vowel.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void missingFleetingVowel() throws Exception {
        String correctAnswerSentenceWithTags =
                "В доме есть много <viewenhancement>окон</viewenhancement>.";
        String submission = "окн";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(
                MISSING_FLEETING_VOWEL,
                ImmutableMap.of("fleeting-vowel-position", 3)
        );

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a missing fleeting vowel.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisNoLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "В доме есть много <viewenhancement>окон</viewenhancement>.";
        String submission = "окнон";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis due to no lemma.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisWrongLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "В доме есть много <viewenhancement>окон</viewenhancement>.";
        String submission = "стул";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis due to wrong lemma.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisOtherReading() throws Exception {
        String correctAnswerSentenceWithTags =
                "В доме есть много <viewenhancement>окон</viewenhancement>.";
        String submission = "окно";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusStemDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis due to another reading.",
                expectedFeedback,
                resultFeedback
        );
    }
}