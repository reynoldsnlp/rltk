package werti.server.interaction.transfer;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.interaction.data.Task;

import java.net.URL;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
@AutoValue
public abstract class TaskResponseData {
    @SerializedName("user-id") public abstract String userId();
    @SerializedName("task-id") public abstract int taskId();
    abstract URL url();
    abstract String title();
    abstract String topic();
    abstract String activity();
    abstract String language();
    abstract String filter();
    abstract long timestamp();
    @SerializedName("number-of-exercises") abstract int numberOfExercises();

    public static TaskResponseData create(
            String userId,
            int taskId,
            URL url,
            String title,
            String topic,
            String activity,
            String language,
            String filter,
            long timestamp,
            int numberOfExercises
    ) {
        return builder()
                .userId(userId)
                .taskId(taskId)
                .url(url)
                .title(title)
                .topic(topic)
                .activity(activity)
                .language(language)
                .filter(filter)
                .timestamp(timestamp)
                .numberOfExercises(numberOfExercises)
                .build();
    }

    public static TaskResponseData create(Task task) {
        return create(
                task.user().uid(),
                task.taskId(),
                task.webPage().url(),
                task.webPage().title(),
                task.topic().topic(),
                task.activity().activity(),
                task.language().toString(),
                task.filter(),
                task.timestamp().getTime(),
                task.numberOfExercises()
        );
    }

    public static TypeAdapter<TaskResponseData> typeAdapter(Gson gson) {
        return new AutoValue_TaskResponseData.GsonTypeAdapter(gson);
    }

    public static Builder builder() {
        return new AutoValue_TaskResponseData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder userId(String userId);

        public abstract Builder taskId(int taskId);

        public abstract Builder url(URL url);

        public abstract Builder topic(String topic);

        public abstract Builder activity(String activity);

        public abstract Builder language(String language);

        public abstract Builder filter(String filter);

        public abstract Builder timestamp(long timestamp);

        public abstract Builder numberOfExercises(int numberOfExercises);

        public abstract Builder title(String title);

        public abstract TaskResponseData build();
    }
}
