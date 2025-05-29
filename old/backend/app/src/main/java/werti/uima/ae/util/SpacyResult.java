package werti.uima.ae.util;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
@AutoValue
public abstract class SpacyResult {
    public abstract List<SpacyToken> words();
    public abstract List<SpacyArc> arcs();

    public static TypeAdapter<SpacyResult> typeAdapter(Gson gson) {
        return new AutoValue_SpacyResult.GsonTypeAdapter(gson);
    }

    public static SpacyResult create(List<SpacyToken> words, List<SpacyArc> arcs) {
        return builder().words(words).arcs(arcs).build();
    }

    public static Builder builder() {
        return new AutoValue_SpacyResult.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder words(List<SpacyToken> words);

        public abstract Builder arcs(List<SpacyArc> arcs);

        public abstract SpacyResult build();
    }
}
