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
public abstract class SpacyArc {
    @SerializedName("dir") public abstract String direction();
    public abstract int start();
    public abstract int end();
    public abstract String label();

    public static TypeAdapter<SpacyArc> typeAdapter(Gson gson) {
        return new AutoValue_SpacyArc.GsonTypeAdapter(gson);
    }

    public static SpacyArc create(String direction, int start, int end, String label) {
        return builder().direction(direction).start(start).end(end).label(label).build();
    }

    public static Builder builder() {
        return new AutoValue_SpacyArc.Builder();
    }


    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder direction(String direction);

        public abstract Builder start(int start);

        public abstract Builder end(int end);

        public abstract Builder label(String label);

        public abstract SpacyArc build();
    }
}
