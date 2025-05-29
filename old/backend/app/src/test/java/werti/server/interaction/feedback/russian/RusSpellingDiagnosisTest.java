package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.feedback.Levenshtein;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.RusStressAnnotator;
import werti.uima.ae.HFSTMalAnnotator;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 25.04.17
 */
public class RusSpellingDiagnosisTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RusSpellingDiagnosis rusSpellingDiagnosis;
    private Levenshtein lev;
    private FeedbackUtils feedbackUtils;


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
                ),
                createEngineDescription(RusStressAnnotator.class)
        );
        lev = new Levenshtein();
        feedbackUtils = new FeedbackUtils();
        rusSpellingDiagnosis = new RusSpellingDiagnosis(feedbackUtils);
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

    private Feedback createFeedbackForWrongSpellingDistanceOne(
            final String submission,
            final String correctAnswer
    ){
        String lowerCaseSubmission = submission.toLowerCase();
        String[][] levMatrix = lev.createLevMatrix(lowerCaseSubmission, correctAnswer);
        String hintAnswer = lev.createHintAnswer(lowerCaseSubmission, levMatrix);

        return Feedback.create(
                WRONG_SPELLING,
                ImmutableMap.of(
                        "hint-answer", hintAnswer,
                        "edit-distance", lev.getEditDistance(),
                        "spelling-correction", lev.getFirstHint(hintAnswer)
                )
        );
    }

    private Feedback createFeedbackForWrongSpellingUnstressedO(
            final int vowelCountAtStressedVowel,
            final int vowelCountAtConfusedVowel
    ){
        return Feedback.create(
                WRONG_SPELLING_UNSTRESSED_O,
                ImmutableMap.of(
                        "vowel-count-at-stressed-vowel", vowelCountAtStressedVowel,
                        "vowel-count-at-confused-vowel", vowelCountAtConfusedVowel
                )
        );
    }

    private Feedback createFeedbackForWrongSpellingUnstressedE(
            final int vowelCountAtStressedVowel,
            final int vowelCountAtConfusedVowel
    ){
        return Feedback.create(
                WRONG_SPELLING_UNSTRESSED_E,
                ImmutableMap.of(
                        "vowel-count-at-stressed-vowel", vowelCountAtStressedVowel,
                        "vowel-count-at-confused-vowel", vowelCountAtConfusedVowel
                )
        );
    }

    @Test
    public void noDiagnosisExactMatch() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас <viewenhancement>дома</viewenhancement> много цветов.";
        String submission = "дома";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = feedbackUtils.produceFeedbackWithTemplate(NO_DIAGNOSIS);

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongSpellingWithJo() throws Exception {
        String correctAnswerSentenceWithTags =
                "Обычно фраза обозначает усвоение родного языка " +
                        "<viewenhancement>ребёнком</viewenhancement>";
        String submission = "ребенком";
        String correctAnswer = "ребёнком";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of 'ё'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsOne() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас <viewenhancement>дома</viewenhancement> много цветов.";
        String submission = "домаа";
        String correctAnswer = "дома";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling with " +
                        "an edit distance of one.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsTwo() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас <viewenhancement>дома</viewenhancement> много цветов.";
        String submission = "дем";
        String correctAnswer = "дома";

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

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsGreaterThanTwo() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас <viewenhancement>дома</viewenhancement> много цветов.";
        String submission = "дооммаа";
        String correctAnswer = "дома";

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

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for no diagnosis.",
                expectedFeedback,
                resultFeedback
        );
    }



    @Test
    public void stressedOStartError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Весной <viewenhancement>озеро</viewenhancement> холодное.";
        String submission = "азеро";
        String correctAnswer = "озеро";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of stressed 'о'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOStartError() throws Exception {
        String correctAnswerSentenceWithTags =
                "На <viewenhancement>окне</viewenhancement> сидела муха.";
        String submission = "акне";
        int vowelCountAtStressedVowel = 2;
        int vowelCountAtConfusedVowel = 1;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedO(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of unstressed 'о'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOStartErrorUpperCase() throws Exception {
        String correctAnswerSentenceWithTags =
                "На <viewenhancement>Окне</viewenhancement> сидела муха.";
        String submission = "Акне";
        int vowelCountAtStressedVowel = 2;
        int vowelCountAtConfusedVowel = 1;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedO(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of unstressed 'О'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOStartErrorWithUnstressedEAfter() throws Exception {
        String correctAnswerSentenceWithTags =
                "Не многие люди идут на <viewenhancement>откровение</viewenhancement>.";
        String submission = "аткровение";
        int vowelCountAtStressedVowel = 3;
        int vowelCountAtConfusedVowel = 1;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedO(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of unstressed 'о'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOMiddleError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Главы двух враждующих <viewenhancement>домов</viewenhancement>.";
        String submission = "дамов";
        int vowelCountAtStressedVowel = 2;
        int vowelCountAtConfusedVowel = 1;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedO(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of unstressed 'о'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOMiddleSecondError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Тёплое <viewenhancement>молоко</viewenhancement> любят дети.";
        String submission = "молако";
        int vowelCountAtStressedVowel = 3;
        int vowelCountAtConfusedVowel = 2;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedO(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of the second unstressed 'о'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedOEndError() throws Exception {
        String correctAnswerSentenceWithTags =
                "У нас дома есть <viewenhancement>радио</viewenhancement>.";
        String submission = "радиа";
        String correctAnswer = "радио";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because the unstressed 'о' at the end is an exception.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedEStartError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Наша <viewenhancement>еда</viewenhancement> стоит на столе.";
        String submission = "ида";
        String correctAnswer = "еда";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because the unstressed 'е' at the start is an exception.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedEStartErrorUpperCase() throws Exception {
        String correctAnswerSentenceWithTags =
                "<viewenhancement>Еда</viewenhancement> стоит на столе.";
        String submission = "Ида";
        String correctAnswer = "Еда";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because the unstressed 'е' at the start is an exception.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void stressedEMiddleError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Горячая <viewenhancement>печка</viewenhancement> долго держит тепло.";
        String submission = "пичка";
        String correctAnswer = "печка";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of stressed 'е'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedEMiddleError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Весной <viewenhancement>озеро</viewenhancement> холодное.";
        String submission = "озиро";
        int vowelCountAtStressedVowel = 1;
        int vowelCountAtConfusedVowel = 2;

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingUnstressedE(
                vowelCountAtStressedVowel,
                vowelCountAtConfusedVowel
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because of unstressed 'е'.",
                expectedFeedback,
                resultFeedback
        );
    }

    @Test
    public void unstressedEEndError() throws Exception {
        String correctAnswerSentenceWithTags =
                "Чёрное <viewenhancement>море</viewenhancement> холодное.";
        String submission = "мори";
        String correctAnswer = "море";

        ConvenientCas cas = analyseWithFeedback(correctAnswerSentenceWithTags, submission);

        Feedback expectedFeedback = createFeedbackForWrongSpellingDistanceOne(
                submission,
                correctAnswer
        );

        Feedback resultFeedback = rusSpellingDiagnosis.getFeedback(cas);

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        "because the unstressed 'е' at the end is an exception.",
                expectedFeedback,
                resultFeedback
        );
    }
}