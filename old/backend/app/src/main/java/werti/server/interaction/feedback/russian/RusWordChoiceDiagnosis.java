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
public class RusWordChoiceDiagnosis implements DiagnosisModule {
    private final FeedbackUtils feedbackUtils;

    @Inject
    public RusWordChoiceDiagnosis(final FeedbackUtils feedbackUtils) {
        this.feedbackUtils = feedbackUtils;
    }

    private static final Pattern posPattern =
            Pattern.compile("[NAV](?=\\+)|Pr$" +
                    "|CC|CS|Det|Adv|Pron|Pcle|Num|Interj|Abbr|Paren|Po");
    private static final Map shortFormToHumanLabelMap = ImmutableMap
            .builder()
            .put("A", "Adjective")
            .put("Abbr", "Abbreviation")
            .put("Adv", "Adverb")
            .put("CC", "Coordinating conjunction")
            .put("CS", "Subordinating conjunction")
            .put("Det", "Determiner")
            .put("Interj", "Interjection")
            .put("N", "Noun")
            .put("Num", "Numeral")
            .put("Paren", "Parenthetical")
            .put("Pcle", "Particle")
            .put("Po", "Postposition")
            .put("Pr", "Preposition")
            .put("Pron", "Pronoun")
            .put("V", "Verb")
            .build();

    public Feedback getFeedback(ConvenientCas cas) {
        SubmissionAnnotation submissionAnnotation = cas.selectFirst(SubmissionAnnotation.class);
        CorrectAnswerAnnotation correctAnswerAnnotation = cas.selectFirst(CorrectAnswerAnnotation.class);

        CGToken submission = cas.selectFirstCovered(CGToken.class, submissionAnnotation);
        CGToken correctAnswer = cas.selectFirstCovered(CGToken.class, correctAnswerAnnotation);

        String submissionLemma = submission.getLemma();

        final ImmutableMap.Builder<String, Object> templateItemMapBuilder =
                ImmutableMap.builder();

        FeedbackMessage feedbackMessage = NO_DIAGNOSIS;

        if(submission.getCoveredText().equals(correctAnswer.getCoveredText())){
            feedbackMessage = getWrongClickMessage(
                    submission,
                    templateItemMapBuilder
            );
        }
        else if(submissionLemma != null &&
                !submissionLemma.equals(correctAnswer.getLemma())){
            feedbackMessage = getWrongPosOrLemmaMessage(
                    correctAnswer,
                    submission,
                    templateItemMapBuilder,
                    submissionLemma
            );
        }

        return feedbackUtils.produceFeedbackWithTemplateAndData(
                feedbackMessage,
                templateItemMapBuilder.build()
        );
    }

    private FeedbackMessage getWrongClickMessage(
            CGToken submission,
            ImmutableMap.Builder<String, Object> templateItemMapBuilder
    ) {
        Matcher submissionPosMatcher = posPattern.matcher(submission.getFirstReading());
        if(submissionPosMatcher.find()){
            String submissionPos = submissionPosMatcher.group();
            templateItemMapBuilder
                    .put("submission-pos",
                            shortFormToHumanLabelMap.get(submissionPos).toString().toLowerCase());

            return  WRONG_CLICK;
        }
        return NO_DIAGNOSIS;
    }

    private FeedbackMessage getWrongPosOrLemmaMessage(
            CGToken correctAnswer,
            CGToken submission,
            ImmutableMap.Builder<String, Object> templateItemMapBuilder,
            String submissionLemma
    ) {
        Matcher correctAnswerPosMatcher = posPattern.matcher(correctAnswer.getFirstReading());
        Matcher submissionPosMatcher = posPattern.matcher(submission.getFirstReading());
        if(correctAnswerPosMatcher.find() &&
                submissionPosMatcher.find()){
            String correctAnswerPos = correctAnswerPosMatcher.group();
            String submissionPos = submissionPosMatcher.group();
            if(!correctAnswerPos.equals(submissionPos)){
                templateItemMapBuilder
                        .put("submission-pos",
                                shortFormToHumanLabelMap.get(submissionPos));

                return WRONG_POS;
            }
            else{
                templateItemMapBuilder
                        .put("submission-lemma", submissionLemma);
                return WRONG_LEMMA;
            }
        }
        return NO_DIAGNOSIS;
    }
}
