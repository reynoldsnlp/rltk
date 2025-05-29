package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-09
 *
 *   {
 *        "document": "<body><p>Als Gregor Samsa eines Morgens aus…",
 *        "language": "de",
 *        "url": "https://example.com",
 *        "features": {
 *          "morphology": {
 *            "pos": "tiger",
 *            "analysis": "true",
 *            "lemma": "true"
 *          }
 *    },
 *        "distractors": {
 *          "select": {
 *            "pos": ["ADJ", "N"]
 *          },
 *          "variable": ["case", "number", "gender"]
 *    }
 *  }
 */
@AutoValue
public abstract class FeatureRequestData {
    abstract String document();
    abstract String language();
    abstract String url();
    abstract FeatureData features();

    public static TypeAdapter<FeatureRequestData> typeAdapter(Gson gson) {
        return new AutoValue_FeatureRequestData.GsonTypeAdapter(gson);
    }

    public static FeatureRequestData create(
            String document, String language, String url, FeatureData features
    ) {
        return builder().document(document).language(language).url(url).features(features).build();
    }

    public static Builder builder() {
        return new AutoValue_FeatureRequestData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder document(String document);

        public abstract Builder language(String language);

        public abstract Builder url(String url);

        public abstract Builder features(FeatureData features);

        public abstract FeatureRequestData build();
    }
}
