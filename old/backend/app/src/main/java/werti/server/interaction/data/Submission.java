package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import werti.server.interaction.feedback.FeedbackMessage;

import java.util.Date;

/**
 * DTO value type for a task log entry.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
@AutoValue
public abstract class Submission {
    public abstract Task task();
    public abstract String enhancementId();
    public abstract Date timestamp();
    public abstract String submission();
    public abstract FeedbackMessage feedback();
    public abstract String feedbackText();

    public static Submission create(
            Task task,
            String enhancementId,
            Date timestamp,
            String submission,
            FeedbackMessage feedbackMessage,
            String feedbackText
    ) {
        return builder()
                .task(task)
                .enhancementId(enhancementId)
                .timestamp(timestamp)
                .submission(submission)
                .feedback(feedbackMessage)
                .feedbackText(feedbackText)
                .build();
    }

    public static Builder builder() {
        return new AutoValue_Submission.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {

        public abstract Builder enhancementId(String enhancementId);

        public abstract Builder timestamp(Date timestamp);

        public abstract Builder submission(String submission);

        public abstract Builder task(Task task);

        public abstract Builder feedback(FeedbackMessage feedbackMessage);

        public abstract Builder feedbackText(String feedback);

        public abstract Submission build();
    }
}
