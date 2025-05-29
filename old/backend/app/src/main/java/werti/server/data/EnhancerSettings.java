package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import werti.uima.enhancer.EnhancementGenerator;

import java.lang.reflect.InvocationTargetException;
import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-25
 */
@AutoValue
public abstract class EnhancerSettings {
    @SerializedName("with") abstract String enhancementClass();
    abstract Map<String, String> configuration();

    public static TypeAdapter<EnhancerSettings> typeAdapter(Gson gson) {
        return new AutoValue_EnhancerSettings.GsonTypeAdapter(gson);
    }

    public static EnhancerSettings create(String enhancementClass, Map<String, String> configuration) {
        return new AutoValue_EnhancerSettings(enhancementClass, configuration);
    }

    public EnhancementGenerator getEnhancementGenerator() throws ViewConfigurationException {
        try {
            final Class<?> enhancerClass = Class.forName(enhancementClass());
            final Object instance =
                    enhancerClass.getConstructor(Map.class).newInstance(configuration());
            if (instance instanceof EnhancementGenerator) {
                return (EnhancementGenerator) instance;
            } else {
                throw new ViewConfigurationException(
                        "Enhancer class not an EnhancementGenerator! " + instance .getClass()
                );
            }
        } catch ( ClassNotFoundException
                | IllegalAccessException
                | InstantiationException
                | InvocationTargetException
                | NoSuchMethodException
                e ) {
            throw new ViewConfigurationException(e);
        }
    }
}
