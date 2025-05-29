package werti.uima.ae.util;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
@AutoValue
public abstract class SpacyRequest {
    abstract String text();
    abstract String model();
    @SerializedName("collapse_punctuation") abstract int collapsePunctuation();
    @SerializedName("collapse_phrases") abstract int collapsePhrases();

    public static SpacyRequest create(
            String text, String model, int collapsePunctuation, int collapsePhrases
    ) {
        return builder().text(text)
                        .model(model)
                        .collapsePunctuation(collapsePunctuation)
                        .collapsePhrases(collapsePhrases)
                        .build();
    }

    public static TypeAdapter<SpacyRequest> typeAdapter(Gson gson) {
        return new AutoValue_SpacyRequest.GsonTypeAdapter(gson);
    }

    public static Builder builder() {
        return new AutoValue_SpacyRequest.Builder();
    }

    public static SpacyRequest create(String text, String language) {
        return builder()
                .model(language)
                .collapsePhrases(0)
                .collapsePunctuation(0)
                .text(text)
                .build();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder text(String text);

        public abstract Builder model(String model);

        public abstract Builder collapsePunctuation(int collapsePunctuation);

        public abstract Builder collapsePhrases(int collapsePhrases);

        public abstract SpacyRequest build();
    }
}
