package werti.server.interaction.feedback;

import org.junit.Before;
import org.junit.Test;
import org.trimou.util.ImmutableMap;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.interaction.data.Feedback;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.CorrectAnswerAnnotation;
import werti.uima.types.annot.SubmissionAnnotation;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.Assert.assertEquals;
import static werti.server.interaction.feedback.FeedbackMessage.*;

/**
 * @author Eduard Schaf
 * @since 04.05.17
 */
public class FeedbackUtilsTest {
    private FeedbackUtils feedbackUtils;
    private ConvenientCas cas;

    @Before
    public void setup() throws Exception {

        final UimaTestService uimaService = new UimaTestService();
        cas = uimaService.provideCas();
        feedbackUtils = new FeedbackUtils();
    }

    @Test
    public void findIndicesForOneTarget() throws Exception {
        String sentence = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "аллофонами.";

        String sentenceWithoutTags = sentence.replaceAll("</?viewenhancement>", "");

        String expected = "фонеме";

        List<Integer> resultIndices = feedbackUtils.findIndices(sentence);

        String result = IntStream
                .range(0, resultIndices.size()-1)
                .mapToObj(i -> sentenceWithoutTags.substring(resultIndices.get(i), resultIndices.get(i+1)))
                .collect(Collectors.joining(" "));

        assertEquals(
                "Using the result indices we should be able to find the target " +
                        "in a sentence without the tags.",
                expected,
                result
        );
    }

    @Test
    public void findIndicesForMultipleTargets() throws Exception {
        String sentence = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "<viewenhancement>аллофонами</viewenhancement>.";

        String sentenceWithoutTags = sentence.replaceAll("</?viewenhancement>", "");

        String expected = "фонеме аллофонами";

        List<Integer> resultIndices = feedbackUtils.findIndices(sentence);

        String result = IntStream
                .range(0, resultIndices.size()-1)
                .filter(n -> n % 2 == 0)
                .mapToObj(i -> sentenceWithoutTags.substring(resultIndices.get(i), resultIndices.get(i+1)))
                .collect(Collectors.joining(" "));

        assertEquals(
                "Using the result indices we should be able to find all targets " +
                        "in a sentence without the tags.",
                expected,
                result
        );
    }

    @Test
    public void createSubmissionSentenceWithOneSubmission() throws Exception {
        String sentence = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "аллофонами.";

        String submission = "фонем";

        String expected = "Фоны, принадлежащие к одной " +
                "<viewenhancement>" + submission + "</viewenhancement>, называются " +
                "аллофонами.";

        String result = feedbackUtils.createSubmissionSentence(sentence, submission);

        assertEquals(
                "The sentence should contain the submission.",
                expected,
                result
        );
    }

    @Test
    public void createSubmissionSentenceWithMultipleSubmissions() throws Exception {
        String sentence = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "<viewenhancement>аллофонами</viewenhancement>.";

        String submission1 = "фонем";
        String submission2 = "аллофонам";

        String submission = submission1 + ";" + submission2;

        String expected = "Фоны, принадлежащие к одной " +
                "<viewenhancement>" + submission1 + "</viewenhancement>, называются " +
                "<viewenhancement>" + submission2 + "</viewenhancement>.";

        String result = feedbackUtils.createSubmissionSentence(sentence, submission);

        assertEquals(
                "The sentence should contain all submissions.",
                expected,
                result
        );
    }

    @Test
    public void prepareCasSubmissionAnnotation() throws Exception {
        String sentenceWithTags = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "аллофонами.";

        String submission = "фонем";

        feedbackUtils.prepareCas(cas, sentenceWithTags, submission, Language.RUSSIAN);

        String expected = "фонем:28-33";

        String result = cas
                .select(SubmissionAnnotation.class)
                .stream()
                .map(submissionAnnotation -> submissionAnnotation.getCoveredText() +
                        ":" + submissionAnnotation.getBegin() + "-" + submissionAnnotation.getEnd())
                .collect(Collectors.joining(" "));

        assertEquals(
                "Should have a SubmissionAnnotation with correct indices.",
                expected,
                result
        );
    }

    @Test
    public void prepareCasCorrectAnswerAnnotation() throws Exception {
        String sentenceWithTags = "Фоны, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "аллофонами.";

        String submission = "фонем";

        feedbackUtils.prepareCas(cas, sentenceWithTags, submission, Language.RUSSIAN);

        String expected = "фонеме:86-92";

        String result = cas
                .select(CorrectAnswerAnnotation.class)
                .stream()
                .map(submissionAnnotation -> submissionAnnotation.getCoveredText() +
                        ":" + submissionAnnotation.getBegin() + "-" + submissionAnnotation.getEnd())
                .collect(Collectors.joining(" "));

        assertEquals(
                "Should have a SubmissionAnnotation with correct indices.",
                expected,
                result
        );
    }

    @Test
    public void getAnnotationTextMultiSubmission() throws Exception {
        String sentenceWithTags = "<viewenhancement>Фоны</viewenhancement>, принадлежащие к одной " +
                "<viewenhancement>фонеме</viewenhancement>, называются " +
                "аллофонами.";

        String submission = "Фоны;фонем";

        feedbackUtils.prepareCas(cas, sentenceWithTags, submission, Language.RUSSIAN);

        String expected = "Фоны фонем";

        String result = feedbackUtils.getAnnotationText(cas, SubmissionAnnotation.class);

        assertEquals(
                "Should get the annotation text of the submission.",
                expected,
                result
        );
    }

    @Test
    public void produceFeedbackWithTemplateAndData() throws Exception {
        final Map<String, Object> templateItemMap = ImmutableMap.of("submission-pos", "Verb");

        Feedback expected = Feedback.create(
                WRONG_POS,
                templateItemMap
        );

        Feedback result = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_POS,
                templateItemMap
        );

        assertEquals(
                "The feedback should be a message for a wrong spelling, " +
                        " and the template items should be inside the message.",
                expected,
                result
        );
    }

    @Test
    public void produceFeedbackWithTemplate() throws Exception {
        Feedback expectedFeedback = Feedback.create(EXACT_MATCH);

        Feedback result = feedbackUtils.produceFeedbackWithTemplate(EXACT_MATCH);

        assertEquals(
                "The feedback should be a message for an exact match.",
                expectedFeedback,
                result
        );
    }
}