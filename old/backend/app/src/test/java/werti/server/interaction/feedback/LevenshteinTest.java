package werti.server.interaction.feedback;

import org.junit.Before;
import org.junit.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 26.04.17
 */
public class LevenshteinTest {
    private Levenshtein levenshtein;

    @Before
    public void setUp() throws Exception {
        levenshtein = new Levenshtein();
    }

    @Test
    public void editDistance0() throws Exception {
        String submission = "Мама";
        String correctAnswer = "Мама";

        levenshtein.createLevMatrix(submission, correctAnswer);

        int expected = 0;
        int result = levenshtein.getEditDistance();

        assertEquals(
                "The edit distance should be 0.",
                expected,
                result
        );
    }

    @Test
    public void editDistance1() throws Exception {
        String submission = "Мам";
        String correctAnswer = "Мама";

        levenshtein.createLevMatrix(submission, correctAnswer);

        int expected = 1;
        int result = levenshtein.getEditDistance();

        assertEquals(
                "The edit distance should be 1.",
                expected,
                result
        );
    }

    @Test
    public void hintAnswerWhenNoHints() throws Exception {
        String submission = "Мама";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        String result = levenshtein.createHintAnswer(submission, levMatrix);

        assertEquals(
                "The hint answer should be identical to the submission.",
                submission,
                result
        );
    }

    @Test
    public void hintAnswerSubstitution() throws Exception {
        String submission = "Мома";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        String expected = "М<span name=\"S\" class=\"hint-answer-style-substitution\">о</span>ма";
        String result = levenshtein.createHintAnswer(submission, levMatrix);

        assertEquals(
                "The hint answer should contain a " +
                        "substitution span around char 'о'.",
                expected,
                result
        );
    }

    @Test
    public void hintAnswerInsertion() throws Exception {
        String submission = "Мма";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        String expected = "М<span name=\"I\" " +
                "class=\"hint-answer-style-insertion\">_</span>ма";
        String result = levenshtein.createHintAnswer(submission, levMatrix);

        assertEquals(
                "The hint answer should contain an " +
                        "insertion span between 'М' and 'м' .",
                expected,
                result
        );
    }

    @Test
    public void hintAnswerDeletion() throws Exception {
        String submission = "Мамаа";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        String expected = "Мам<span name=\"D\" class=\"hint-answer-style-deletion\">а</span>а";
        String result = levenshtein.createHintAnswer(submission, levMatrix);

        assertEquals(
                "The hint answer should contain a " +
                        "deletion span around the second to last char.",
                expected,
                result
        );
    }

    @Test
    public void hintAnswerWhenMultipleHints() throws Exception {
        String submission = "Ммаб";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        String expected = "М<span name=\"I\" class=\"hint-answer-style-insertion\">_</span>ма<span name=\"D\" class=\"hint-answer-style-deletion\">б</span>";
        String result = levenshtein.createHintAnswer(submission, levMatrix);

        assertEquals(
                "The hint answer should contain a " +
                        "insertion span around the second char and a " +
                        "deletion span around the last char.",
                expected,
                result
        );
    }

    @Test
    public void firstHintSubstitute() throws Exception {
        String submission = "Мома";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);
        String hintAnswer = levenshtein.createHintAnswer(submission, levMatrix);

        String expected = "substitute";
        String result = levenshtein.getFirstHint(hintAnswer);

        assertEquals(
                "The first hint should be to substitute one letter.",
                expected,
                result
        );
    }

    @Test
    public void firstHintInsert() throws Exception {
        String submission = "Мма";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);
        String hintAnswer = levenshtein.createHintAnswer(submission, levMatrix);

        String expected = "insert";
        String result = levenshtein.getFirstHint(hintAnswer);

        assertEquals(
                "The first hint should be to insert one letter.",
                expected,
                result
        );
    }

    @Test
    public void firstHintDelete() throws Exception {
        String submission = "Мамаа";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);
        String hintAnswer = levenshtein.createHintAnswer(submission, levMatrix);

        String expected = "delete";
        String result = levenshtein.getFirstHint(hintAnswer);

        assertEquals(
                "The first hint should be to delete one letter.",
                expected,
                result
        );
    }

    @Test
    public void firstHintWhenMultipleHints() throws Exception {
        String submission = "Ммаб";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);
        String hintAnswer = levenshtein.createHintAnswer(submission, levMatrix);

        String expected = "insert";
        String result = levenshtein.getFirstHint(hintAnswer);

        assertEquals(
                "The first hint should be to insert one letter.",
                expected,
                result
        );
    }

    @Test
    public void firstHintWhenNoHints() throws Exception {
        String submission = "Мама";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);
        String hintAnswer = levenshtein.createHintAnswer(submission, levMatrix);

        String expected = "";
        String result = levenshtein.getFirstHint(hintAnswer);

        assertEquals(
                "The first hint should be an empty string.",
                expected,
                result
        );
    }

    @Test
    public void correctionIndexListSubstitute() throws Exception {
        String submission = "Мома";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        List<Integer> expected = Collections.singletonList(1);
        List<Integer> result = levenshtein.createCorrectionIndexList(levMatrix);

        assertEquals(
                "The index of the correction should be 1.",
                expected,
                result
        );
    }

    @Test
    public void correctionIndexListInsert() throws Exception {
        String submission = "Мма";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        List<Integer> expected = Collections.singletonList(1);
        List<Integer> result = levenshtein.createCorrectionIndexList(levMatrix);

        assertEquals(
                "The index of the correction should be 1.",
                expected,
                result
        );
    }

    @Test
    public void correctionIndexListDelete() throws Exception {
        String submission = "Мамам";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        List<Integer> expected = Collections.singletonList(4);
        List<Integer> result = levenshtein.createCorrectionIndexList(levMatrix);

        assertEquals(
                "The index of the correction should be 4.",
                expected,
                result
        );
    }

    @Test
    public void correctionIndexListMultipleCorrections() throws Exception {
        String submission = "Ммаб";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        List<Integer> expected = Arrays.asList(1, 3);
        List<Integer> result = levenshtein.createCorrectionIndexList(levMatrix);

        assertEquals(
                "The indexes of the corrections should be 1 and 3.",
                expected,
                result
        );
    }

    @Test
    public void correctionIndexListNoCorrections() throws Exception {
        String submission = "Мама";
        String correctAnswer = "Мама";

        String[][] levMatrix = levenshtein.createLevMatrix(submission, correctAnswer);

        List<Integer> expected = new ArrayList<>();
        List<Integer> result = levenshtein.createCorrectionIndexList(levMatrix);

        assertEquals(
                "There should be no indexes.",
                expected,
                result
        );
    }
}