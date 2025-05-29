package werti.server.interaction.feedback;

import com.google.common.collect.ImmutableMap;
import org.junit.Before;
import org.junit.Test;
import org.trimou.engine.MustacheEngine;
import werti.server.TestMustache;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.FeedbackResponseData;

import static org.junit.Assert.assertEquals;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * This test is designed to check the feedback template functionality.
 *
 * @author Eduard Schaf
 * @since 02.06.17
 */
public class FeedbackTemplateTest {
    private MustacheEngine mustacheEngine;
    private Levenshtein lev;
    private static final String SPAN_CLASS_GREEN =
            "<span class='feedback-style-green'>";
    private static final String SPAN_CLASS_RED =
            "<span class='feedback-style-red'>";
    private static final String SPAN_END = "</span>";
    private static final String HINT_BTN =
            "<button type='button' id='feedback-hint-btn-1' " +
            "class='feedback-hint-btn' data-feedback-level='1'>HINT</button>";
    private static final String FEEDBACK_DIV =
            "<div id='feedback-hint-1' class='feedback-hint'>";
    private static final String DIV_END = "</div>";
    private final String NOUN_CASE_TABLE =
            getHtmlWithNumberAndHintText(HINT_BTN, 1, "Show case table") +
            getHtmlWithNumber(FEEDBACK_DIV, 1) +
            "<table id=\"feedback-case-table\"> <tr> <th>Case</th> <th>Questions</th> " +
            "<th>Function</th> <th>Prepositions</th> </tr> <tr> <td>Nominative</td> " +
            "<td>Кто? | Что?</td> <td>subject</td> <td>---</td> </tr> <tr> " +
            "<td>Genitive</td> <td>Кого? | Чего?</td> <td>possession(of), lack or " +
            "absence(не~)</td> <td>без, для, до, из<br></td> </tr> <tr> <td>Dative</td> " +
            "<td>Кому? | Чему?</td> <td>indirect object</td> <td>по(due to), к, согласно, " +
            "подобно</td> </tr> <tr> <td>Accusative</td> <td>Кого? | Что?</td> <td>direct " +
            "object, motion, duration</td> <td>в(into), на(onto), за(for), через</td> " +
            "</tr> <tr> <td>Instrumental</td> <td>Кем? | Чем?</td> <td>person/object " +
            "performing an action</td> <td>с(with), над, под(under), перед</td> </tr> " +
            "<tr> <td>Prepositional</td> <td>О ком? | О чём?</td> <td>location, " +
            "person/object being talked about</td> <td>в(in/at), на(on/at), о(б), " +
            "при</td> </tr> </table>" + DIV_END + "<br> ";
    private static final String RULE_BTN = " <button type='button' " +
            "id='feedback-rule-btn'>Show Rule</button>";
    private static String RENDERED_RULE;
    private static final String LEGEND = "<div id='hint-answer-legend'>Legend: " +
            "<span class='hint-answer-style-substitution'>Substitute</span> | " +
            "<span class='hint-answer-style-insertion'>Insert</span> | " +
            "<span class='hint-answer-style-deletion'>Delete</span>" + DIV_END;

    private String getHtmlWithNumber(String html, int number){
        return html.replace("1", Integer.toString(number));
    }

    private String getHtmlWithNumberAndHintText(String html, int number, String text){
        return html
                .replace("1", Integer.toString(number))
                .replace("HINT", text);
    }

    private String getNumberWithEnumeration(final int number){
        if(number == 1){
            return number + "st";
        } else if(number == 2){
            return number + "nd";
        } else if(number == 3){
            return number + "rd";
        } else{
            return number + "th";
        }
    }

    @Before
    public void setUp() throws Exception {
        mustacheEngine = new TestMustache().getFeedbackMustache();
        lev = new Levenshtein();
        RENDERED_RULE = mustacheEngine
                .getMustache("rule-unstressed-oe-confusion")
                .render(ImmutableMap.of());
    }

    @Test
    public void providedSolution() throws Exception {
        String expected = "You should try harder next time!";

        String result = FeedbackResponseData.render(
                Feedback.create(PROVIDED_SOLUTION),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a provided solution message.",
                expected,
                result
        );
    }

    @Test
    public void exactMatch() throws Exception {
        String expected = "Well done!";

        String result = FeedbackResponseData.render(
                Feedback.create(EXACT_MATCH),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be an exact match message.",
                expected,
                result
        );
    }

    @Test
    public void wrongClickBasic() throws Exception {
        String expected = "You clicked the wrong word!";

        String result = FeedbackResponseData.render(
                Feedback.create(WRONG_CLICK_BASIC),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong click basic message.",
                expected,
                result
        );
    }

    @Test
    public void lowercaseMatch() throws Exception {
        String expected = "The answer is correct, but watch out for any " +
                "capitalization errors.";

        String result = FeedbackResponseData.render(
                Feedback.create(LOWERCASE_MATCH),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a lowercase match message.",
                expected,
                result
        );
    }

    @Test
    public void spaceMatch() throws Exception {
        String expected = "The answer is correct, but there should be " +
                "unnecessary spaces.";

        String result = FeedbackResponseData.render(
                Feedback.create(SPACE_MATCH),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a space match message.",
                expected,
                result
        );
    }

    @Test
    public void noDiagnosis() throws Exception {
        String expected = "Sorry, we can't give you any feedback for your " +
                "submission, please try again.";

        String result = FeedbackResponseData.render(
                Feedback.create(NO_DIAGNOSIS),
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a no diagnosis message.",
                expected,
                result
        );
    }

    @Test
    public void wrongLemma() throws Exception {
        String submissionLemma = "книга";

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "The " +
                "category (part-of-speech) is correct, but you should think about " +
                "your word choice." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "What is the lemma of my submission?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "The lemma of " +
                "your submission is: " + SPAN_CLASS_RED + "книга" + SPAN_END +
                DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Which lemma should it have?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "Take a look at " +
                "the word next to the input field.<br> Your submission should be one " +
                "form of this word." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", submissionLemma)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong lemma message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongPos() throws Exception {
        String submissionPos = "Verb";

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Are you sure that your " +
                "word belongs to the correct category (part-of-speech)?" + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "What is the part-of-speech of my submission?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "Your submission " +
                "belongs to the following category: " + SPAN_CLASS_RED + submissionPos +
                SPAN_END + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Which part-of-speech should it have?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "Take a look at the " +
                "selected topic." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_POS,
                ImmutableMap.of("submission-pos", submissionPos)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong pos message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongClick() throws Exception {
        String submissionPos = "Verb";

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                        getHtmlWithNumber(FEEDBACK_DIV, 1) + "You clicked the wrong " +
                        "word!" + DIV_END + "<br> " +
                        getHtmlWithNumberAndHintText(HINT_BTN, 2,
                                "What is wrong with the word?") +
                        getHtmlWithNumber(FEEDBACK_DIV, 2) + "It belongs to the " +
                        "wrong part-of-speech (" + SPAN_CLASS_RED + submissionPos +
                        SPAN_END + ")." + DIV_END + "<br> " +
                        getHtmlWithNumberAndHintText(HINT_BTN, 3,
                                "What can I do better next time?") +
                        getHtmlWithNumber(FEEDBACK_DIV, 3) + "Avoid this category and " +
                        "take another look at the topic." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_CLICK,
                ImmutableMap.of("submission-pos", submissionPos)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong pos message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongNumberAnimate() throws Exception {
        String submissionNumber = "Plural";
        String correctAnswerNumber = "Singular";

        String expected =
                NOUN_CASE_TABLE +
                getHtmlWithNumberAndHintText(HINT_BTN, 2, "Which form did I enter?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "You entered the " +
                SPAN_CLASS_RED + submissionNumber + SPAN_END + " form." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3, "Which form is correct?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "We look for the " +
                SPAN_CLASS_GREEN + correctAnswerNumber + SPAN_END + " form." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_NUMBER,
                ImmutableMap.of(
                        "submission-number", submissionNumber,
                        "correct-answer-number", correctAnswerNumber
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong number message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongCaseInanimate() throws Exception {
        String submissionCase = "Nominative";
        String correctAnswerCase = "Accusative";

        String expected =
                NOUN_CASE_TABLE +
                getHtmlWithNumberAndHintText(HINT_BTN, 2, "Which form did I enter?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "You entered the " +
                SPAN_CLASS_RED + submissionCase + SPAN_END + " form." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3, "Which form is correct?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "We look for the " +
                SPAN_CLASS_GREEN + correctAnswerCase + SPAN_END + " form." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_CASE,
                ImmutableMap.of(
                        "submission-case", submissionCase,
                        "correct-answer-case", correctAnswerCase
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong case message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongNumberAndCaseInanimate() throws Exception {
        String submissionNumber = "Plural";
        String correctAnswerNumber = "Singular";
        String submissionCase = "Locative";
        String correctAnswerCase = "Dative";

        String expected =
                NOUN_CASE_TABLE +
                getHtmlWithNumberAndHintText(HINT_BTN, 2, "Which form did I enter?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "You typed the word in " +
                SPAN_CLASS_RED + submissionNumber + SPAN_END + " and " +
                SPAN_CLASS_RED + submissionCase + SPAN_END + " form." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3, "Which form is correct?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "We look for a word in " +
                SPAN_CLASS_GREEN + correctAnswerNumber + SPAN_END + " and " +
                SPAN_CLASS_GREEN + correctAnswerCase + SPAN_END + " form." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_NUMBER_AND_CASE,
                ImmutableMap.of(
                        "submission-number", submissionNumber,
                        "correct-answer-number", correctAnswerNumber,
                        "submission-case", submissionCase,
                        "correct-answer-case", correctAnswerCase
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong number and case message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsOne() throws Exception {
        String submission = "домаа";
        String correctAnswer = "дома";

        String lowerCaseSubmission = submission.toLowerCase();
        String[][] levMatrix = lev.createLevMatrix(lowerCaseSubmission, correctAnswer);
        String hintAnswer = lev.createHintAnswer(lowerCaseSubmission, levMatrix);
        String firstHint = lev.getFirstHint(hintAnswer);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Your submission is not " +
                "an existing word.<br> Maybe you misspelled the ending or some other " +
                "part of the word?" + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "How many mistakes did I make?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "There is a slight " +
                "spelling mistake.<br> You only have to " + firstHint + " one letter." +
                DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Show the spelling correction") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "Let me help you " +
                "correct your spelling mistake:<br> " + hintAnswer + "<br> " + LEGEND + DIV_END;
        Feedback feedback = Feedback.create(
                WRONG_SPELLING,
                ImmutableMap.of(
                        "hint-answer", hintAnswer,
                        "edit-distance", lev.getEditDistance(),
                        "spelling-correction", lev.getFirstHint(hintAnswer)
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong spelling message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsTwo() throws Exception {
        String submission = "дем";
        String correctAnswer = "дома";

        String[][] levMatrix = lev.createLevMatrix(submission, correctAnswer);
        String hintAnswer = lev.createHintAnswer(submission, levMatrix);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Your submission is not " +
                "an existing word.<br> Maybe you misspelled the ending or some other " +
                "part of the word?" + DIV_END +
                "<br> " + getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "How many mistakes did I make?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "There should be two " +
                "spelling mistakes." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Show the spelling correction") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "Let me help you correct " +
                "your spelling mistake:<br> " + hintAnswer + "<br> " + LEGEND + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_SPELLING,
                ImmutableMap.of(
                        "hint-answer", hintAnswer,
                        "edit-distance", lev.getEditDistance(),
                        "spelling-correction", lev.getFirstHint(hintAnswer)
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong spelling message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingEditDistanceIsGreaterThanTwo() throws Exception {
        String submission = "дооммаа";
        String correctAnswer = "дома";

        String[][] levMatrix = lev.createLevMatrix(submission, correctAnswer);
        String hintAnswer = lev.createHintAnswer(submission, levMatrix);
        int editDistance = lev.getEditDistance();

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Your submission is not " +
                "an existing word.<br> Maybe you misspelled the ending or some other " +
                "part of the word?" + DIV_END +
                "<br> " + getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "How many mistakes did I make?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "There are more than two " +
                "spelling mistakes (" + editDistance + ").<br> Your submission might " +
                "be too far from the correct answer." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Show the spelling correction") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "Let me help you correct " +
                "your spelling mistake:<br> " + hintAnswer + "<br> " + LEGEND + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_SPELLING,
                ImmutableMap.of(
                        "hint-answer", hintAnswer,
                        "edit-distance", lev.getEditDistance(),
                        "spelling-correction", lev.getFirstHint(hintAnswer)
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong spelling message with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void renderedRule() throws Exception {
        String expected = "<div id='feedback-rule'>" +
                "The unstressed vowels 'o' and 'е' are pronounced differently.<br> " +
                "This phenomenon can be checked by altering the word form.<br><br> " +
                "Example: We have the word 'дома' (pronounced дама́) with " +
                "unstressed 'o'.<br> " +
                "But we know, that there is a word form 'дом' (pronounced до́м) with " +
                "stressed 'o'.<br> " +
                "In this case, this vowel must be spelled like 'o' in every " +
                "word form.</div>";

        String result = RENDERED_RULE;

        assertEquals(
                "The rendered rule should look like expected.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingUnstressedO() throws Exception {
        int vowelCountAtStressedVowel = 1;
        int vowelCountAtConfusedVowel = 2;

        String vowelCountAtStressedVowelWithEnum = getNumberWithEnumeration(vowelCountAtStressedVowel);
        String vowelCountAtConfusedVowelWithEnum = getNumberWithEnumeration(vowelCountAtConfusedVowel);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Remember, " +
                SPAN_CLASS_GREEN + "unstressed 'о'" + SPAN_END + " may sound " +
                "like " + SPAN_CLASS_RED + "'а'" + SPAN_END + ".<br>" + RULE_BTN +
                RENDERED_RULE + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "Which vowel is stressed?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "The " +
                vowelCountAtStressedVowelWithEnum + " vowel is stressed." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Which vowel is wrong?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "The " +
                vowelCountAtConfusedVowelWithEnum+ " vowel is wrong." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_SPELLING_UNSTRESSED_O,
                ImmutableMap.of(
                        "vowel-count-at-stressed-vowel", vowelCountAtStressedVowel,
                        "vowel-count-at-confused-vowel", vowelCountAtConfusedVowel
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong spelling unstressed 'о' message " +
                        "with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void wrongSpellingUnstressedE() throws Exception {
        int vowelCountAtStressedVowel = 1;
        int vowelCountAtConfusedVowel = 2;

        String vowelCountAtStressedVowelWithEnum = getNumberWithEnumeration(vowelCountAtStressedVowel);
        String vowelCountAtConfusedVowelWithEnum = getNumberWithEnumeration(vowelCountAtConfusedVowel);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "Remember, " +
                SPAN_CLASS_GREEN + "unstressed 'е'" + SPAN_END + " may sound " +
                "like " + SPAN_CLASS_RED + "'и'" + SPAN_END + ".<br>" +
                RULE_BTN + RENDERED_RULE + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                "Which vowel is stressed?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "The " +
                vowelCountAtStressedVowelWithEnum + " vowel is stressed." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                "Which vowel is wrong?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "The " +
                vowelCountAtConfusedVowelWithEnum + " vowel is wrong." + DIV_END;

        Feedback feedback = Feedback.create(
                WRONG_SPELLING_UNSTRESSED_E,
                ImmutableMap.of(
                        "vowel-count-at-stressed-vowel", vowelCountAtStressedVowel,
                        "vowel-count-at-confused-vowel", vowelCountAtConfusedVowel
                )
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a wrong spelling unstressed 'е' message " +
                        "with correct variables.",
                expected,
                result
        );
    }

    @Test
    public void noPalatalization() throws Exception {
        int softConsonantPosition = 2;

        String softConsonantPositionWithEnum = getNumberWithEnumeration(softConsonantPosition);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "The correct answer contains " +
                "a soft consonant, but you didn't use<br> a soft-indicating letter.<br> For " +
                "example the word 'тётя' [ˈtʲɵtʲə] (aunt) contains two soft consonants,<br> " +
                "followed by a soft indicating letter each." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                        "What are soft-indicating letters?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "They indicate that the " +
                "preceding consonant has a soft pronunciation. <br> In other words, " +
                "the consonant is palatalized. <br> The soft-indicating letters are: " +
                "я, е, ё, и, ю" + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                        "Which consonant isn't followed by a soft-indicating letter?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "The " +
                softConsonantPositionWithEnum + " letter is the soft consonant in question." +
                DIV_END;

        Feedback feedback = Feedback.create(
                NO_PALATALIZATION,
                ImmutableMap.of("soft-consonant-position", softConsonantPosition)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a no palatalization message with the correct variable.",
                expected,
                result
        );
    }

    @Test
    public void extraFleetingVowel() throws Exception {
        int fleetingVowelPosition = 2;

        String fleetingVowelPositionWithEnum = getNumberWithEnumeration(fleetingVowelPosition);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "The declination of this " +
                "word is irregular.<br> Except of the nominative singular form, all " +
                "other forms have a changed stem.<br> For example the genitive singular " +
                "form of отец (father) is " + SPAN_CLASS_GREEN + "отца" + SPAN_END +
                " and not " + SPAN_CLASS_RED + "отеца" + SPAN_END + "." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                        "What is the cause of the irregularity?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "The stem contains a " +
                "fleeting vowel which can only be found in the<br> nominative singular " +
                "form.<br> Fleeting vowels are 'о' and 'е'." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                        "Where is the fleeting vowel?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "The " +
                fleetingVowelPositionWithEnum + " letter is the fleeting vowel." +
                DIV_END;

        Feedback feedback = Feedback.create(
                EXTRA_FLEETING_VOWEL,
                ImmutableMap.of("fleeting-vowel-position", fleetingVowelPosition)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a no palatalization message with the correct variable.",
                expected,
                result
        );
    }

    @Test
    public void missingFleetingVowel() throws Exception {
        int fleetingVowelPosition = 2;

        String fleetingVowelPositionWithEnum = getNumberWithEnumeration(fleetingVowelPosition);

        String expected =
                getHtmlWithNumberAndHintText(HINT_BTN, 1, "General info") +
                getHtmlWithNumber(FEEDBACK_DIV, 1) + "The declination of this " +
                "word is irregular.<br> The genitive plural form has " +
                "a changed stem.<br> For example the genitive plural form of" +
                " окно (window) is " + SPAN_CLASS_GREEN + "окон" + SPAN_END +
                " and not " + SPAN_CLASS_RED + "окн" + SPAN_END + "." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 2,
                        "What is the cause of the irregularity?") +
                getHtmlWithNumber(FEEDBACK_DIV, 2) + "The stem contains a " +
                "fleeting vowel which can only be found in the<br> genitive plural " +
                "form.<br> Fleeting vowels are 'о' and 'е'." + DIV_END + "<br> " +
                getHtmlWithNumberAndHintText(HINT_BTN, 3,
                        "Where is the fleeting vowel?") +
                getHtmlWithNumber(FEEDBACK_DIV, 3) + "The fleeting vowel " +
                "has to be inserted before the " + fleetingVowelPositionWithEnum +
                " letter." + DIV_END;

        Feedback feedback = Feedback.create(
                MISSING_FLEETING_VOWEL,
                ImmutableMap.of("fleeting-vowel-position", fleetingVowelPosition)
        );

        String result = FeedbackResponseData.render(
                feedback,
                mustacheEngine
        ).message();

        assertEquals(
                "There should be a no palatalization message with the correct variable.",
                expected,
                result
        );
    }
}