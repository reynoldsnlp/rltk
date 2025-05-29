package werti.server.interaction.feedback;

import org.junit.Before;
import org.junit.Test;
import org.trimou.util.ImmutableMap;
import werti.server.interaction.data.AnswerAssessment;
import werti.server.interaction.data.Feedback;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static werti.server.interaction.data.AnswerAssessment.*;
import static werti.server.interaction.feedback.FeedbackMessage.NO_DIAGNOSIS;
import static werti.server.interaction.feedback.FeedbackMessage.WRONG_LEMMA;

/**
 * @author Eduard Schaf
 * @since 26.04.17
 */
public class FeedbackComparatorTest {
    private FeedbackComparator feedbackComparator;
    private FeedbackUtils feedbackUtils;

    @Before
    public void setUp() throws Exception {
        List<AnswerAssessment> answerAssessmentPriorityList = new ArrayList<>(Arrays.asList(
                WORD_CHOICE,
                WORD_FORM,
                AGREEMENT,
                WORD_ORDER,
                STEM,
                SPELLING,
                UNKNOWN
        ));
        feedbackComparator = new FeedbackComparator(answerAssessmentPriorityList);
        feedbackUtils = new FeedbackUtils();
    }

    @Test
    public void firstFeedbackHasHigherPriority() throws Exception {
        Feedback feedback1 = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", "книга")
        );
        Feedback feedback2 = feedbackUtils.produceFeedbackWithTemplate(NO_DIAGNOSIS);

        int expectedValue = -1;
        int resultValue = feedbackComparator.compare(feedback1, feedback2);

        assertEquals(
                "Feedback 1 should have the lower priority.",
                expectedValue,
                resultValue
        );
    }

    @Test
    public void secondFeedbackHasHigherPriority() throws Exception {
        Feedback feedback1 = feedbackUtils.produceFeedbackWithTemplate(NO_DIAGNOSIS);
        Feedback feedback2 = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", "книга")
        );

        int expectedValue = 1;
        int resultValue = feedbackComparator.compare(feedback1, feedback2);

        assertEquals(
                "Feedback 2 should have the higher priority.",
                expectedValue,
                resultValue
        );
    }

    @Test
    public void answerAssessmentMissingInPriorityList() throws Exception {
        List<AnswerAssessment> answerAssessmentPriorityList = new ArrayList<>(Arrays.asList(
                WORD_FORM,
                AGREEMENT,
                WORD_ORDER,
                STEM,
                SPELLING
        ));
        feedbackComparator = new FeedbackComparator(answerAssessmentPriorityList);

        Feedback feedback1 = feedbackUtils.produceFeedbackWithTemplateAndData(
                WRONG_LEMMA,
                ImmutableMap.of("submission-lemma", "книга")
        );

        Feedback feedback2 = feedbackUtils.produceFeedbackWithTemplate(NO_DIAGNOSIS);

        int expectedValue = 0;
        int resultValue = feedbackComparator.compare(feedback1, feedback2);

        assertEquals(
                "Feedback 1 and 2 should have the same priority.",
                expectedValue,
                resultValue
        );
    }
}
