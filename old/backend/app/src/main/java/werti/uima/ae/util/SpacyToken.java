package werti.uima.ae.util;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
@AutoValue
public abstract class SpacyToken {
    public abstract String text();
    public abstract String tag();

    public static TypeAdapter<SpacyToken> typeAdapter(Gson gson) {
        return new AutoValue_SpacyToken.GsonTypeAdapter(gson);
    }

    public static SpacyToken create(String text, String pos) {
        return builder().text(text).tag(pos).build();
    }

    public static Builder builder() {
        return new AutoValue_SpacyToken.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder text(String text);

        public abstract Builder tag(String pos);

        public abstract SpacyToken build();
    }
}
