package werti.server.interaction.feedback;

import werti.server.interaction.data.AnswerAssessment;
import werti.server.interaction.data.Feedback;

import java.util.Comparator;
import java.util.List;

/**
 * Compare two instances of feedback according to the priority list.
 *
 * @author Eduard Schaf
 * @since 26.04.17
 */
public class FeedbackComparator implements Comparator<Feedback> {
    private List<AnswerAssessment> answerAssessmentPriorityList;

    public FeedbackComparator(List<AnswerAssessment> answerAssessmentPriorityList) {
        this.answerAssessmentPriorityList = answerAssessmentPriorityList;
    }

    /*
     * (non-Javadoc)
     * @see java.util.Comparator#compare(java.lang.Object, java.lang.Object)
     */
    public int compare(Feedback o1, Feedback o2) {
        AnswerAssessment answerAssessment1 = o1.feedbackMessage().getAnswerAssessment();
        AnswerAssessment answerAssessment2 = o2.feedbackMessage().getAnswerAssessment();

        for (AnswerAssessment answerAssessmentPriority : answerAssessmentPriorityList) {
            if (answerAssessmentPriority.equals(answerAssessment1)) {
                return -1;
            } else if (answerAssessmentPriority.equals(answerAssessment2)) {
                return 1;
            }
        }
        return 0;
    }
}
