package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-17
 */
@AutoValue
public abstract class JsonRequestData {
    abstract String url();
    abstract String language();
    abstract String topic();
    abstract String activity();
    abstract String document();

    public static JsonRequestData create(String url, String language, String topic, String activity, String document) {
        return builder()
                .url(url)
                .language(language)
                .topic(topic)
                .activity(activity)
                .document(document)
                .build();
    }

    public static TypeAdapter<JsonRequestData> typeAdapter(Gson gson) {
        return new AutoValue_JsonRequestData.GsonTypeAdapter(gson);
    }

    public static Builder builder() {
        return new AutoValue_JsonRequestData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder url(String url);

        public abstract Builder language(String language);

        public abstract Builder topic(String topic);

        public abstract Builder activity(String activity);

        public abstract Builder document(String document);

        public abstract JsonRequestData build();
    }
}
