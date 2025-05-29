package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import werti.server.interaction.feedback.FeedbackMessage;

/**
 * DTO value type for task performance assessment data.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
@AutoValue
public abstract class TaskPerformance {
    public abstract String enhancementId();
    public abstract Task task();
    public abstract String correctAnswer();
    public abstract int numberOfTries();
    public abstract boolean usedSolution();
    public abstract String sentence();
    public abstract FeedbackMessage feedback();

    public static TaskPerformance create(
            String enhancementId,
            Task task,
            String correctAnswer,
            int numberOfTries,
            boolean usedSolution,
            String sentence,
            FeedbackMessage feedbackMessage
    ) {
        return builder()
                .enhancementId(enhancementId)
                .task(task)
                .correctAnswer(correctAnswer)
                .numberOfTries(numberOfTries)
                .usedSolution(usedSolution)
                .sentence(sentence)
                .feedback(feedbackMessage)
                .build();
    }

    public static Builder builder() {
        return new AutoValue_TaskPerformance.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder enhancementId(String enhancementId);

        public abstract Builder correctAnswer(String correctAnswer);

        public abstract Builder numberOfTries(int numberOfTries);

        public abstract Builder usedSolution(boolean usedSolution);

        public abstract Builder task(Task task);

        public abstract Builder sentence(String sentence);

        public abstract Builder feedback(FeedbackMessage feedbackMessage);

        public abstract TaskPerformance build();
    }
}
