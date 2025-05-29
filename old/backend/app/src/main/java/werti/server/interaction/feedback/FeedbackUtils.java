package werti.server.interaction.feedback;

import org.apache.uima.jcas.tcas.Annotation;
import werti.Language;
import werti.server.interaction.data.Feedback;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.AnalysisResults;
import werti.uima.types.annot.BlockText;
import werti.uima.types.annot.CorrectAnswerAnnotation;
import werti.uima.types.annot.SubmissionAnnotation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Finds the indices of viewenhancements inside a string.
 *
 * @author Eduard Schaf
 * @since 04.05.17
 */
public class FeedbackUtils {
    private static final String TAG_REGEX = "</?viewenhancement>";
    private static final Pattern TAG_PATTERN = Pattern.compile(TAG_REGEX);
    private static final String TAG_START = "<viewenhancement>";
    private static final String TAG_END = "</viewenhancement>";
    private static final String FAKE_TAG_START = "<ñôŃßĘńŠē>";
    private static final String FAKE_TAG_END = "</ñôŃßĘńŠē>";

    /**
     * Finds the indices of viewenhancements inside a string.
     *
     * @param sentence the string with viewenhancements
     *
     * @return a list of integer containing start and end
     * index in 2-steps e.g. [star1, end1, start2, end2...]
     */
    public List<Integer> findIndices(String sentence) {
        List<Integer> resultIndices = new ArrayList<>();
        Matcher tagMatcher = TAG_PATTERN.matcher(sentence);
        int index;
        int tagOffset = 0;
        while(tagMatcher.find()){
            int tagStart = tagMatcher.start();
            int tagEnd = tagMatcher.end();
            int tagLength = tagEnd - tagStart;

            index = tagStart - tagOffset;
            resultIndices.add(index);
            tagOffset += tagLength;
        }
        return resultIndices;
    }

    /**
     * Create a sentence containing all submissions provided inside
     * of the viewenhancements.
     *
     * @param sentence the sentence with viewenhancements
     * @param submissions ";" delimited string of submissions
     * @return a sentence containing all submissions
     */
    public String createSubmissionSentence(String sentence, String submissions) {
        String[] submissionArr = submissions.split(";");
        String submissionSentence = sentence;

        for(String aSubmission: submissionArr){
            submissionSentence = submissionSentence
                    .replaceFirst(
                            TAG_START + ".+?" + TAG_END,
                            FAKE_TAG_START + aSubmission + FAKE_TAG_END
                    );
        }
        return submissionSentence
                .replace(FAKE_TAG_START, TAG_START)
                .replace(FAKE_TAG_END, TAG_END);
    }

    /**
     * Prepare the cas before running the pipeline:
     * - set language
     * - set document text
     * - create BlockText annotations
     * - create AnalysisResults annotations
     * - create SubmissionAnnotation annotations
     * - create CorrectAnswerAnnotation annotations
     *
     * @param cas the current cas
     * @param correctAnswerSentenceWithTags the original sentence with tags
     * @param submission ";" delimited string of submissions
     * @param language the language of the document
     */
    public void prepareCas(
            ConvenientCas cas,
            String correctAnswerSentenceWithTags,
            String submission,
            Language language
    ){
        final String submissionSentenceWithTags =
                createSubmissionSentence(correctAnswerSentenceWithTags, submission);
        final String submissionSentence =
                submissionSentenceWithTags
                        .replaceAll(TAG_REGEX, "");
        final String correctAnswerSentence =
                correctAnswerSentenceWithTags
                        .replaceAll(TAG_REGEX, "");

        final String analysisInput = submissionSentence + " " + correctAnswerSentence;
        cas.setDocumentLanguage(language);
        cas.setDocumentText(analysisInput);

        cas.createAnnotation(0, analysisInput.length(), BlockText.class);
        cas.createAnnotation(0, analysisInput.length(), AnalysisResults.class);

        annotateTags(cas, submissionSentenceWithTags, SubmissionAnnotation.class, 0);

        int submissionSentenceOffset = submissionSentence.length() + 1;
        annotateTags(cas, correctAnswerSentenceWithTags,
                CorrectAnswerAnnotation.class, submissionSentenceOffset);
    }

    /**
     * Create an annotation for each tag in the sentence.
     *
     * @param cas the current cas
     * @param sentenceWithTags the sentence with tags
     * @param annotationClass the class of the annotation
     * @param offset the offset by which the indices are off
     * @param <T> the annotation type
     */
    private <T extends Annotation> void annotateTags(
            ConvenientCas cas,
            String sentenceWithTags,
            Class<T> annotationClass,
            int offset
    ) {
        final List<Integer> indicesList = findIndices(sentenceWithTags);

        for(int i = 0; i < indicesList.size()-1; i +=2){
            int startIndex = indicesList.get(i) + offset;
            int endIndex = indicesList.get(i+1) + offset;

            cas.createAnnotation(startIndex, endIndex, annotationClass);
        }
    }

    /**
     * Get the covered text of the given annotation delimited by a space.
     *
     * @param cas the current cas
     * @param annotationClass the class of the annotation
     * @param <T> the annotation type
     *
     * @return a space delimited string of the annotation's covered text
     */
    public <T extends Annotation> String getAnnotationText(ConvenientCas cas, Class<T> annotationClass) {
        return cas.select(annotationClass)
                .stream()
                .map(Annotation::getCoveredText)
                .collect(Collectors.joining(" "));
    }

    /**
     * Produce feedback with the template located in
     * 'src/main/html/feedback' and the provided data.
     *
     * @param feedbackMessage the object with template and answer assessment
     * @param templateItemMap the map containing all variables used in
     *                        a template
     * @return the feedback with the template and data
     */
    public Feedback produceFeedbackWithTemplateAndData(
            final FeedbackMessage feedbackMessage,
            final Map<String, Object> templateItemMap
    ) {
        return Feedback.create(feedbackMessage, templateItemMap);
    }

    /**
     * Produce a feedback with the template located in
     * 'src/main/html/feedback' without any data.
     *
     * @param feedbackMessage the object with template and answer assessment
     * @return the feedback with the template
     */
    public Feedback produceFeedbackWithTemplate(
            final FeedbackMessage feedbackMessage
    ) {
        return Feedback.create(feedbackMessage);
    }
}
