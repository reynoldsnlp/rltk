package werti.server.interaction.feedback.russian;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import org.trimou.util.ImmutableMap;
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
public class RusWordFormDiagnosisTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RusWordFormDiagnosis rusWordFormDiagnosis;

    @Before
    public void loadAEAndSetup() throws Exception {
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
        rusWordFormDiagnosis = new RusWordFormDiagnosis(feedbackUtils);
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
    public void wrongNumberAndCaseInanimate() throws Exception {
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

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong number and case.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongNumberAnimate() throws Exception {
        String correctAnswerSentenceWithTags =
                "Наш <viewenhancement>кот</viewenhancement> поймал мышку.";
        String submission = "коты";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        String submissionNumber = "Plural";
        String correctAnswerNumber = "Singular";

        Feedback expectedFeedback = Feedback.create(
                WRONG_NUMBER,
                ImmutableMap.of(
                        "submission-number", submissionNumber,
                        "correct-answer-number", correctAnswerNumber
                )
        );

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong number.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongCaseInanimateAcc() throws Exception {
        String correctAnswerSentenceWithTags =
                "Я купил новую <viewenhancement>книгу</viewenhancement>.";
        String submission = "книга";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        String submissionCase = "Nominative";
        String correctAnswerCase = "Accusative";

        Feedback expectedFeedback = Feedback.create(
                WRONG_CASE,
                ImmutableMap.of(
                        "submission-case", submissionCase,
                        "correct-answer-case", correctAnswerCase
                )
        );

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong case.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisNoLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "К <viewenhancement>дому</viewenhancement> подъехала машина.";
        String submission = "домс";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisWrongLemma() throws Exception {
        String correctAnswerSentenceWithTags =
                "На берегу озера стоит <viewenhancement>дом</viewenhancement>.";
        String submission = "стул";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void noDiagnosisTargetNotNoun() throws Exception {
        String correctAnswerSentenceWithTags =
                "Я купил <viewenhancement>новую</viewenhancement> книгу.";
        String submission = "новая";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = Feedback.create(NO_DIAGNOSIS);

        Feedback resultFeedback = rusWordFormDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }
}