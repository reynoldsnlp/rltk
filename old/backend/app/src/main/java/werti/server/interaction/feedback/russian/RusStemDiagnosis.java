package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.feedback.DiagnosisModule;
import werti.server.interaction.feedback.FeedbackMessage;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.feedback.Levenshtein;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.CorrectAnswerAnnotation;
import werti.uima.types.annot.SubmissionAnnotation;

import javax.inject.Inject;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public class RusStemDiagnosis implements DiagnosisModule {
    private final FeedbackUtils feedbackUtils;
    private static final Pattern errorPattern = Pattern.compile("Err/L2_Pal|Err/L2_FV|Err/L2_NoFV");

    @Inject
    public RusStemDiagnosis(final FeedbackUtils feedbackUtils) {
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
            feedbackMessage = getStemMessage(
                    submission,
                    correctAnswer,
                    templateItemMapBuilder
            );
        }

        return feedbackUtils.produceFeedbackWithTemplateAndData(
                feedbackMessage,
                templateItemMapBuilder.build()
        );
    }

    private FeedbackMessage getStemMessage(
            CGToken submission,
            CGToken correctAnswer,
            ImmutableMap.Builder<String, Object> templateItemMapBuilder
    ) {
        Matcher submissionErrorMatcher = errorPattern.matcher(submission.getFirstReading());

        if(submissionErrorMatcher.find()){
            String errorType = submissionErrorMatcher.group();

            Levenshtein lev = new Levenshtein();

            String[][] levMatrix = lev.createLevMatrix(
                    submission.getCoveredText(),
                    correctAnswer.getCoveredText()
            );

            int correctionIndex = lev.createCorrectionIndexList(levMatrix).get(0);

            switch(errorType) {
                case "Err/L2_Pal":
                    templateItemMapBuilder.put(
                            "soft-consonant-position",
                            correctionIndex
                    );
                    return NO_PALATALIZATION;
                case "Err/L2_FV":
                    templateItemMapBuilder.put(
                            "fleeting-vowel-position",
                            correctionIndex + 1
                    );
                    return  EXTRA_FLEETING_VOWEL;
                default:
                    templateItemMapBuilder.put(
                            "fleeting-vowel-position",
                            correctionIndex + 1
                    );
                    return MISSING_FLEETING_VOWEL;
            }
        }
        return NO_DIAGNOSIS;
    }
}
