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
public abstract class TaskRequestData implements AuthenticationData {

    @Override @SerializedName("token")
    public abstract String authenticationToken();
    public abstract String url();
    public abstract String title();
    public abstract String topic();
    public abstract String activity();
    public abstract String filter();
    public abstract String language();
    public abstract long timestamp();

    @SerializedName("number-of-exercises")
    public abstract int numberOfExercises();

    public static TaskRequestData create(
            String authenticationToken,
            String url,
            String title,
            String topic,
            String activity,
            String filter,
            String language,
            long timestamp,
            int numberOfExercises
    ) {
        return builder()
                .authenticationToken(authenticationToken)
                .url(url)
                .title(title)
                .topic(topic)
                .activity(activity)
                .filter(filter)
                .language(language)
                .timestamp(timestamp)
                .numberOfExercises(numberOfExercises)
                .build();
    }

    public static Builder builder() {
        return new $AutoValue_TaskRequestData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder authenticationToken(String authenticationToken);

        public abstract Builder url(String url);

        public abstract Builder topic(String topic);

        public abstract Builder activity(String activity);

        public abstract Builder language(String language);

        public abstract Builder timestamp(long timestamp);

        public abstract Builder numberOfExercises(int numberOfExercises);

        public abstract Builder filter(String filter);

        public abstract Builder title(String title);

        public abstract TaskRequestData build();
    }

    public static TypeAdapter<TaskRequestData> typeAdapter(Gson gson) {
        return new AutoValue_TaskRequestData.GsonTypeAdapter(gson);
    }
}
