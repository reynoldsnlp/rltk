package werti.server.interaction.transfer;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.interaction.data.TaskPerformance;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-27
 */
@AutoValue
public abstract class PerformanceResponseData {
    @SerializedName("enhancement-id") public abstract String enhancementId();
    @SerializedName("task-id") public abstract int taskId();
    @SerializedName("correct-answer") public abstract String correctAnswer();
    @SerializedName("number-of-tries") public abstract int numberOfTries();
    @SerializedName("used-solution") public abstract boolean usedSolution();
    public abstract String sentence();
    public abstract String assessment();

    public static PerformanceResponseData create(
            String enhancementId,
            int taskId,
            String correctAnswer,
            int numberOfTries,
            boolean usedSolution,
            String sentence,
            String assessment
    ) {
        return new AutoValue_PerformanceResponseData(
                enhancementId,
                taskId,
                correctAnswer,
                numberOfTries,
                usedSolution,
                sentence,
                assessment
        );
    }

    public static PerformanceResponseData create(TaskPerformance performance) {
        return create(
                performance.enhancementId(),
                performance.task().taskId(),
                performance.correctAnswer(),
                performance.numberOfTries(),
                performance.usedSolution(),
                performance.sentence(),
                performance.feedback().name()
        );
    }

    public static TypeAdapter<PerformanceResponseData> typeAdapter(Gson gson) {
        return new AutoValue_PerformanceResponseData.GsonTypeAdapter(gson);
    }
}
