package werti.server.interaction.transfer;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.interaction.authentication.AuthenticationData;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
@AutoValue
public abstract class TrackingRequestData implements AuthenticationData {
    @Override @SerializedName("token")
    public abstract String authenticationToken();

    @SerializedName("task-id")
    public abstract int taskId();

    @SerializedName("enhancement-id")
    public abstract String enhancementId();

    public abstract String submission();

    @SerializedName("is-correct")
    public abstract boolean isCorrect();

    @SerializedName("correct-answer")
    public abstract String correctAnswer();

    @SerializedName("used-solution")
    public abstract boolean usedSolution();

    public abstract String sentence();

    public abstract long timestamp();

    public static TrackingRequestData create(
            String authenticationToken,
            int taskId,
            String enhancementId,
            String submission,
            boolean isCorrect,
            String correctAnswer,
            boolean usedSolution,
            String sentence,
            long timestamp
    ) {
        return builder()
                .authenticationToken(authenticationToken)
                .taskId(taskId)
                .enhancementId(enhancementId)
                .submission(submission)
                .isCorrect(isCorrect)
                .correctAnswer(correctAnswer)
                .usedSolution(usedSolution)
                .sentence(sentence)
                .timestamp(timestamp)
                .build();
    }

    public static Builder builder() {
        return new $AutoValue_TrackingRequestData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder authenticationToken(String authenticationToken);

        public abstract Builder enhancementId(String enhancementId);

        public abstract Builder submission(String submission);

        public abstract Builder correctAnswer(String correctAnswer);

        public abstract Builder timestamp(long timestamp);

        public abstract Builder isCorrect(boolean newCorrect);

        public abstract Builder usedSolution(boolean newUsedSolution);

        public abstract Builder taskId(int taskToken);

        public abstract Builder sentence(String sentence);

        public abstract TrackingRequestData build();
    }

    public static TypeAdapter<TrackingRequestData> typeAdapter(Gson gson) {
        return new AutoValue_TrackingRequestData.GsonTypeAdapter(gson);
    }
}
