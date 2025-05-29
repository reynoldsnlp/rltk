package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import werti.Language;
import werti.util.DuplicateElementException;

import java.util.List;
import java.util.Optional;

import static werti.util.Streams.toOnlyElement;
import static werti.util.Streams.toOnlyElementThrowing;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-14.10.16
 */
@AutoValue
public abstract class Topic {
    public abstract String topic();
    public abstract List<String> authors();
    public abstract List<Pipeline> pipelines();
    public abstract Description description();
    public abstract List<Activity> activities();

    public static Topic create(String topic, List<String> authors, List<Pipeline> pipelines, Description description, List<Activity> activities) {
        return builder()
                .topic(topic)
                .authors(authors)
                .pipelines(pipelines)
                .description(description)
                .activities(activities)
                .build();
    }

    public Optional<Pipeline> getPipelineFor(final Language language) {
        return pipelines().stream().filter(
                pipeline -> pipeline.language().equals(language)
        ).reduce(toOnlyElement());
    }

    public Optional<Activity> selectActivity(String activityName) {
        return activities().stream()
                .filter(activity -> activity.activity().equals(activityName))
                .reduce(toOnlyElementThrowing(DuplicateElementException::new));
    }

    public static Builder builder() {
        return new $AutoValue_Topic.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {

        public abstract Builder authors(List<String> authors);

        public abstract Builder description(Description description);

        public abstract Builder activities(List<Activity> activities);

        public abstract Builder pipelines(List<Pipeline> pipelines);

        public abstract Builder topic(String topic);

        public abstract Topic build();
    }

    public static TypeAdapter<Topic> typeAdapter(Gson gson) {
        return new AutoValue_Topic.GsonTypeAdapter(gson);
    }
}
