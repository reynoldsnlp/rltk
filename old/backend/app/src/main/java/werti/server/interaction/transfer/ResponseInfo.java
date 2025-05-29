package werti.server.interaction.transfer;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.server.analysis.ViewRequestException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
@AutoValue
public abstract class ResponseInfo {
    abstract String message();
    @SerializedName("status") abstract int statusCode();

    public static ResponseInfo create(String message, int statusCode) {
        return new AutoValue_ResponseInfo(message, statusCode);
    }

    public static TypeAdapter<ResponseInfo> typeAdapter(Gson gson) {
        return new AutoValue_ResponseInfo.GsonTypeAdapter(gson);
    }

    public static ResponseInfo create(ViewRequestException e) {
        return create(e.getMessage(), e.getStatus());
    }
}
