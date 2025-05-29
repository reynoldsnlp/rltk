package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.interaction.authentication.AuthenticationData;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-07-16
 */
@AutoValue
public abstract class TokenRequestData implements AuthenticationData {
    @Override @SerializedName("token")
    public abstract String authenticationToken();

    public static TokenRequestData create(String authenticationToken) {
        return builder()
                .authenticationToken(authenticationToken)
                .build();
    }


    public static TypeAdapter<TokenRequestData> typeAdapter(Gson gson) {
        return new AutoValue_TokenRequestData.GsonTypeAdapter(gson);
    }

    public static Builder builder() {
        return new AutoValue_TokenRequestData.Builder();
    }


    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder authenticationToken(String authenticationToken);

        public abstract TokenRequestData build();
    }
}
