package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.interaction.authentication.User;

import java.util.Date;

/**
 * DTO value type for tasks.
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
@AutoValue
public abstract class Task {
    public abstract User user();
    public abstract int taskId();
    public abstract WebPage webPage();
    public abstract Topic topic();
    public abstract Activity activity();
    public abstract Language language();
    public abstract String filter();
    public abstract Date timestamp();
    public abstract int numberOfExercises();

    public static Task create(
            User user,
            int taskId,
            WebPage webPage,
            Topic topic,
            Activity activity,
            Language language,
            String filter,
            Date timestamp,
            int numberOfExercises
    ) {
        return builder()
                .user(user)
                .taskId(taskId)
                .webPage(webPage)
                .topic(topic)
                .activity(activity)
                .language(language)
                .filter(filter)
                .timestamp(timestamp)
                .numberOfExercises(numberOfExercises)
                .build();
    }

    public static Builder builder() {
        return new AutoValue_Task.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder user(User user);

        public abstract Builder webPage(WebPage webPage);

        public abstract Builder topic(Topic topic);

        public abstract Builder activity(Activity activity);

        public abstract Builder language(Language language);

        public abstract Builder timestamp(Date timestamp);

        public abstract Builder numberOfExercises(int numberOfExercises);

        public abstract Builder taskId(int taskId);

        public abstract Builder filter(String filter);

        public abstract Task build();
    }
}
