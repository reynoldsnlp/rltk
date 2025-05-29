package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-07-16
 */
@AutoValue
public abstract class ErrorData {
    abstract int errorCode();
    abstract String errorMessage();
    abstract String errorType();

    public static ErrorData create(
            int errorCode,
            String errorMessage,
            String errorType
    ) {
        return builder()
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .errorType(errorType)
                .build();
    }

    public static Builder builder() {
        return new AutoValue_ErrorData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder errorCode(int errorCode);

        public abstract Builder errorMessage(String errorMessage);

        public abstract Builder errorType(String errorType);

        public abstract ErrorData build();
    }

    public static TypeAdapter<ErrorData> typeAdapter(Gson gson) {
        return new AutoValue_ErrorData.GsonTypeAdapter(gson);
    }
}
