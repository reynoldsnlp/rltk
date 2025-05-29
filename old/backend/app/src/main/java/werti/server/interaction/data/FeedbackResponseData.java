package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import org.trimou.engine.MustacheEngine;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
@AutoValue
public abstract class FeedbackResponseData {
    public abstract String assessment();
    public abstract String message();

    public static FeedbackResponseData render(Feedback feedback, MustacheEngine mustacheEngine) {
        return create(
                feedback.feedbackMessage().name(),
                feedback.renderWith(mustacheEngine)
        );
    }

    public static FeedbackResponseData create(String assessment, String message) {
        return new AutoValue_FeedbackResponseData(assessment, message);
    }

    public static TypeAdapter<FeedbackResponseData> typeAdapter(Gson gson) {
        return new AutoValue_FeedbackResponseData.GsonTypeAdapter(gson);
    }
}
