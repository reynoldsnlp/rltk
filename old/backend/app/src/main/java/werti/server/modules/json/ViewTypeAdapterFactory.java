package werti.server.modules.json;

import com.google.gson.TypeAdapterFactory;
import com.ryanharter.auto.value.gson.GsonTypeAdapterFactory;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-16
 */
@GsonTypeAdapterFactory
public abstract class ViewTypeAdapterFactory implements TypeAdapterFactory {
    public static TypeAdapterFactory create() {
        return new AutoValueGson_ViewTypeAdapterFactory();
    }
}
