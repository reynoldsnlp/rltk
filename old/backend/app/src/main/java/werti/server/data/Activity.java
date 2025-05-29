package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-14.10.16
 */
@AutoValue
public abstract class Activity {
    public abstract String activity();
    public abstract Description description();
    @SerializedName("enhance") public abstract EnhancerSettings enhancementDescription();

    public static Activity create(String activity, Description description, EnhancerSettings enhancerSettings) {
        return builder()
                .activity(activity)
                .description(description)
                .enhancementDescription(enhancerSettings)
                .build();
    }

    public static Builder builder() {
        return new $AutoValue_Activity.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {

        public abstract Builder description(Description description);

        public abstract Builder activity(String activity);

        public abstract Builder enhancementDescription(EnhancerSettings enhancerSettings);

        public abstract Activity build();
    }

    public static TypeAdapter<Activity> typeAdapter(Gson gson) {
        return new AutoValue_Activity.GsonTypeAdapter(gson);
    }
}
