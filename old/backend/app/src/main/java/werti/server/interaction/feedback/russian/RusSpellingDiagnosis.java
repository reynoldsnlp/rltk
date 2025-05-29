package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableMap;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.feedback.DiagnosisModule;
import werti.server.interaction.feedback.FeedbackMessage;
import werti.server.interaction.feedback.FeedbackUtils;
import werti.server.interaction.feedback.Levenshtein;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.AnalysisResults;
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
public class RusSpellingDiagnosis implements DiagnosisModule {

    private static final String O = "о";
    private static final String E = "е";
    private static final String STRESS_MARKER = "\u0301";
    private static final Pattern VOWEL_PATTERN = Pattern.compile("[SEаеиоуыэюяё]");
    private final FeedbackUtils feedbackUtils;

    @Inject
    public RusSpellingDiagnosis(final FeedbackUtils feedbackUtils) {
        this.feedbackUtils = feedbackUtils;
    }

    public Feedback getFeedback(ConvenientCas cas) {
        String submission = feedbackUtils
                .getAnnotationText(cas, SubmissionAnnotation.class)
                .toLowerCase();

        String correctAnswer = feedbackUtils
                .getAnnotationText(cas, CorrectAnswerAnnotation.class)
                .toLowerCase();

        Levenshtein lev = new Levenshtein();

        String[][] levMatrix = lev.createLevMatrix(submission, correctAnswer);

        int levDistance = lev.getEditDistance();

        final ImmutableMap.Builder<String, Object> templateItemMapBuilder =
                ImmutableMap.builder();

        FeedbackMessage feedbackMessage = NO_DIAGNOSIS;

        if(levDistance > 0){

            String answerWithStress = cas
                    .selectFirst(AnalysisResults.class)
                    .getAnswerWithStress()
                    .toLowerCase();

            feedbackMessage = applyRuleAndGetFeedbackMessage(
                    answerWithStress,
                    submission,
                    lev,
                    levMatrix,
                    levDistance,
                    templateItemMapBuilder
            );
        }
        return feedbackUtils.produceFeedbackWithTemplateAndData(
                feedbackMessage,
                templateItemMapBuilder.build()
        );
    }

    /**
     * The unstressed "о" or "е" rule can be applied when
     * - the position of the unstressed vowel is not at the end
     * - and the unstressed vowel was confused with the wrong vowel
     * If the rule does not apply we found a regular spelling mistake.
     *
     * @param answerWithStress the answer with stress
     * @param submission the submission of the student
     * @param lev an instance of the levenshtein algorithm
     * @param levMatrix the generated levenshtein matrix
     * @param levDistance the levenshtein distance
     * @param templateItemMapBuilder the map with items required in the template
     *
     * @return the feedback message after the rule was applied
     */
    private FeedbackMessage applyRuleAndGetFeedbackMessage(
            final String answerWithStress,
            final String submission,
            final Levenshtein lev,
            final String[][] levMatrix,
            final int levDistance,
            final ImmutableMap.Builder<String, Object> templateItemMapBuilder
    ) {
        String modifiedAnswerWithStress = answerWithStress
                .replaceAll("." + STRESS_MARKER, "S") // stressed
                .replaceAll("^" + E, "E") // exception "е" at begin
                .replaceAll("[ео]" + "$", "E"); // exception "о" or "е" at end

        Matcher vowelMatcher = VOWEL_PATTERN.matcher(modifiedAnswerWithStress);

        FeedbackMessage feedbackMessage = WRONG_SPELLING;

        int vowelCountAtConfusedVowel = -1;
        int vowelCountAtStressedVowel = -1;

        if(submission.length() == modifiedAnswerWithStress.length()){
            int vowelCounter = 0;

            while(vowelMatcher.find()){
                vowelCounter++;

                int vowelPosition = vowelMatcher.start();
                String vowel = vowelMatcher.group();
                Character submissionCharAtVowelPosition = submission.charAt(vowelPosition);

                if(O.equals(vowel)
                        && submissionCharAtVowelPosition == 'а'){
                    vowelCountAtConfusedVowel = vowelCounter;
                    feedbackMessage = WRONG_SPELLING_UNSTRESSED_O;
                }

                else if(E.equals(vowel)
                        && submissionCharAtVowelPosition == 'и'){
                    vowelCountAtConfusedVowel = vowelCounter;
                    feedbackMessage = WRONG_SPELLING_UNSTRESSED_E;
                }

                else if("S".equals(vowel)){
                    vowelCountAtStressedVowel = vowelCounter;
                }
            }
        }

        if(vowelCountAtConfusedVowel > -1){
            templateItemMapBuilder
                    .put("vowel-count-at-confused-vowel", vowelCountAtConfusedVowel)
                    .put("vowel-count-at-stressed-vowel", vowelCountAtStressedVowel);
        }
        else{
            String hintAnswer = lev.createHintAnswer(submission, levMatrix);

            templateItemMapBuilder
                    .put("hint-answer", hintAnswer)
                    .put("edit-distance", levDistance)
                    .put("spelling-correction", lev.getFirstHint(hintAnswer));
        }


        return feedbackMessage;
    }
}
