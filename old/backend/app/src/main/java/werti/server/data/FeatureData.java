package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-09
 *
 *        "features": {
 *          "morphology": {
 *            "pos": "tiger",
 *            "analysis": "true",
 *            "lemma": "true"
 *          }
 */
@AutoValue
public abstract class FeatureData {
    abstract Map<String, String> morphology();
    abstract Map<String, String> syntax();

    public static FeatureData create(Map<String, String> morphology, Map<String, String> syntax) {
        return builder().morphology(morphology).syntax(syntax).build();
    }

    public static TypeAdapter<FeatureData> typeAdapter(Gson gson) {
        return new AutoValue_FeatureData.GsonTypeAdapter(gson);
    }

    public static Builder builder() {
        return new AutoValue_FeatureData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder morphology(Map<String, String> morphology);

        public abstract Builder syntax(Map<String, String> syntax);

        public abstract FeatureData build();
    }
}
