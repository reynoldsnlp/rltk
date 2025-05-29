package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.feedback.DiagnosisModule;
import werti.server.interaction.feedback.FeedbackMessage;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.CorrectAnswerAnnotation;
import werti.uima.types.annot.SubmissionAnnotation;

import javax.inject.Inject;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public class RusWordFormDiagnosis implements DiagnosisModule {

    private static final Pattern posPattern = Pattern.compile("N\\+");
    private static final Pattern numberPattern = Pattern.compile("Sg|Pl");
    private static final Pattern casePattern =
            Pattern.compile("(Nom|Gen|Dat|Acc|Ins|Loc)$");
    private final FeedbackUtils feedbackUtils;
    private static final Map shortFormToHumanLabelMap = ImmutableMap
            .builder()
            .put("Sg", "Singular")
            .put("Pl", "Plural")
            .put("Nom", "Nominative")
            .put("Gen", "Genitive")
            .put("Dat", "Dative")
            .put("Acc", "Accusative")
            .put("Ins", "Instrumental")
            .put("Loc", "Locative")
            .build();

    @Inject
    public RusWordFormDiagnosis(final FeedbackUtils feedbackUtils) {
        this.feedbackUtils = feedbackUtils;
    }

    public Feedback getFeedback(ConvenientCas cas) {
        SubmissionAnnotation submissionAnnotation = cas.selectFirst(SubmissionAnnotation.class);
        CorrectAnswerAnnotation correctAnswerAnnotation = cas.selectFirst(CorrectAnswerAnnotation.class);

        CGToken submission = cas.selectFirstCovered(CGToken.class, submissionAnnotation);
        CGToken correctAnswer = cas.selectFirstCovered(CGToken.class, correctAnswerAnnotation);

        String submissionLemma = submission.getLemma();

        final ImmutableMap.Builder<String, Object> templateItemMapBuilder =
                ImmutableMap.builder();

        FeedbackMessage feedbackMessage = NO_DIAGNOSIS;

        if(submissionLemma != null &&
                submissionLemma.equals(correctAnswer.getLemma())){
            feedbackMessage = checkTargetAndGetMessage(
                    correctAnswer.getFirstReading(),
                    submission.getFirstReading(),
                    templateItemMapBuilder
            );
        }
        return feedbackUtils.produceFeedbackWithTemplateAndData(
                feedbackMessage,
                templateItemMapBuilder.build()
        );
    }

    /**
     * Find pos and number in the submission and correct answer and proceed
     * to compare their number and case forms to produce feedback.
     *
     * @param correctAnswerFirstReading the first reading of the correct answer
     * @param submissionFirstReading the first reading of the submission
     * @param templateItemMapBuilder the builder for the template item map
     * @return the feedback for the diagnosis module
     */
    private FeedbackMessage checkTargetAndGetMessage(
            String correctAnswerFirstReading,
            String submissionFirstReading,
            ImmutableMap.Builder<String, Object> templateItemMapBuilder
    ) {
        Matcher correctAnswerPosMatcher = posPattern.matcher(correctAnswerFirstReading);
        Matcher correctAnswerNumberMatcher = numberPattern.matcher(correctAnswerFirstReading);
        Matcher correctAnswerCaseMatcher = casePattern.matcher(correctAnswerFirstReading);
        Matcher submissionPosMatcher = posPattern.matcher(submissionFirstReading);
        Matcher submissionNumberMatcher = numberPattern.matcher(submissionFirstReading);
        Matcher submissionCaseMatcher = casePattern.matcher(submissionFirstReading);

        if(correctAnswerPosMatcher.find() &&
                correctAnswerNumberMatcher.find() &&
                correctAnswerCaseMatcher.find() &&
                submissionCaseMatcher.find() &&
                submissionPosMatcher.find() &&
                submissionNumberMatcher.find()){

            return getWordFormMessage(
                    correctAnswerNumberMatcher.group(),
                    correctAnswerCaseMatcher.group(),
                    submissionNumberMatcher.group(),
                    submissionCaseMatcher.group(),
                    templateItemMapBuilder
            );
        }
        return NO_DIAGNOSIS;
    }


    /**
     * Get the word form feedback message depending on which conditions were met.
     *
     * @param correctAnswerNumber the number of the correct answer
     * @param correctAnswerCase the case of the correct answer
     * @param submissionNumber the number of the submission
     * @param submissionCase the case of the submission
     * @param templateItemMapBuilder the builder for the template item map
     *
     * @return the feedback message of the word form
     */
    private FeedbackMessage getWordFormMessage(
            String correctAnswerNumber,
            String correctAnswerCase,
            String submissionNumber,
            String submissionCase,
            ImmutableMap.Builder<String, Object> templateItemMapBuilder
    ) {

        boolean wrongNumber = !submissionNumber.equals(correctAnswerNumber);
        boolean wrongCase = !submissionCase.equals(correctAnswerCase);

        if(wrongNumber && wrongCase){
            templateItemMapBuilder
                    .put("submission-number",
                            shortFormToHumanLabelMap.get(submissionNumber))
                    .put("correct-answer-number",
                            shortFormToHumanLabelMap.get(correctAnswerNumber))
                    .put("submission-case",
                            shortFormToHumanLabelMap.get(submissionCase))
                    .put("correct-answer-case",
                            shortFormToHumanLabelMap.get(correctAnswerCase));
            return WRONG_NUMBER_AND_CASE;
        }
        else if(wrongNumber){
            templateItemMapBuilder
                    .put("submission-number",
                            shortFormToHumanLabelMap.get(submissionNumber))
                    .put("correct-answer-number",
                            shortFormToHumanLabelMap.get(correctAnswerNumber));
            return WRONG_NUMBER;
        }
        else if(wrongCase){
            templateItemMapBuilder
                    .put("submission-case",
                            shortFormToHumanLabelMap.get(submissionCase))
                    .put("correct-answer-case",
                            shortFormToHumanLabelMap.get(correctAnswerCase));
            return WRONG_CASE;
        }
        return NO_DIAGNOSIS;
    }
}