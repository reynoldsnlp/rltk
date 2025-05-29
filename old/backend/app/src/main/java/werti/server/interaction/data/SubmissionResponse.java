package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.interaction.transfer.PerformanceResponseData;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
@AutoValue
public abstract class SubmissionResponse {
    @SerializedName("performance")
    public abstract PerformanceResponseData performanceResponseData();
    @SerializedName("feedback")
    public abstract FeedbackResponseData feedbackResponseData();

    public static SubmissionResponse create(
            PerformanceResponseData performanceResponseData,
            FeedbackResponseData feedbackResponseData
    ) {
        return new AutoValue_SubmissionResponse(performanceResponseData, feedbackResponseData);
    }

    public static TypeAdapter<SubmissionResponse> typeAdapter(Gson gson) {
        return new AutoValue_SubmissionResponse.GsonTypeAdapter(gson);
    }
}
