package werti.server.interaction.feedback;

import werti.server.interaction.data.AnswerAssessment;

import static werti.server.interaction.data.AnswerAssessment.*;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public enum FeedbackMessage {
    /**
     * The student gave up and used the solution provided
     * by clicking on "?".
     */
    PROVIDED_SOLUTION(
            "provided-solution",
            CORRECT
    ),

    /**
     * Submission and correct answer match exactly.
     */
    EXACT_MATCH(
            "exact-match",
            CORRECT
    ),

    /**
     * Submission and correct answer differ in capitalization.
     */
    LOWERCASE_MATCH(
            "lowercase-match",
            CAPITALIZATION
    ),

    /**
     * Submission has unnecessary spaces.
     */
    SPACE_MATCH(
            "space-match",
            EXTRA_SPACE
    ),

    /**
     * The part-of-speech in the submission was wrong.
     */
    WRONG_POS(
            "wrong-pos",
            WORD_CHOICE
    ),

    /**
     * The part-of-speech in the submission was correct, but the lemma was not.
     */
    WRONG_LEMMA(
            "wrong-lemma",
            WORD_CHOICE
    ),

    /**
     * The learner clicked on the wrong word, show only basic information.
     */
    WRONG_CLICK_BASIC(
            "wrong-click-basic",
            WORD_CHOICE
    ),

    /**
     * The learner clicked on the wrong word, show sophisticated information.
     */
    WRONG_CLICK(
            "wrong-click",
            WORD_CHOICE
    ),

    /**
     * The number and case of the word form in the submission was wrong.
     */
    WRONG_NUMBER_AND_CASE(
            "wrong-number-and-case",
            WORD_FORM
    ),

    /**
     * The number of the word form in the submission was wrong.
     */
    WRONG_NUMBER(
            "wrong-number",
            WORD_FORM
    ),

    /**
     * The case of the word form in the submission was wrong.
     */
    WRONG_CASE(
            "wrong-case",
            WORD_FORM
    ),

    /**
     * Failure to place a soft-indicating symbol after soft stem.
     */
    NO_PALATALIZATION(
            "no-palatalization",
            STEM
    ),

    /**
     * Presence of fleeting vowel where it should be deleted.
     */
    EXTRA_FLEETING_VOWEL(
            "extra-fleeting-vowel",
            STEM
    ),

    /**
     * Lack of fleeting vowel where it should be inserted.
     */
    MISSING_FLEETING_VOWEL(
            "missing-fleeting-vowel",
            STEM
    ),

    /**
     * Spelling error in the submission, the word should be spelled with 'o'.
     */
    WRONG_SPELLING_UNSTRESSED_O(
            "wrong-spelling-unstressed-o",
            SPELLING
    ),

    /**
     * Spelling error in the submission, the word should be spelled with 'e'.
     */
    WRONG_SPELLING_UNSTRESSED_E(
            "wrong-spelling-unstressed-e",
            SPELLING
    ),

    /**
     * Spelling error in the submission.
     */
    WRONG_SPELLING(
            "wrong-spelling",
            SPELLING
    ),

    /**
     * No diagnosis can be made, because the result is unknown.
     */
    NO_DIAGNOSIS(
            "no-diagnosis",
            UNKNOWN
    );

    private String templateName;
    private AnswerAssessment answerAssessment;

    FeedbackMessage(String templateName, AnswerAssessment answerAssessment) {
        this.templateName = templateName;
        this.answerAssessment = answerAssessment;
    }

    public String getTemplateName() {
        return templateName;
    }

    public AnswerAssessment getAnswerAssessment() {
        return answerAssessment;
    }
}
