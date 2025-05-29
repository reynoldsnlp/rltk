package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.uima.DescriptionGenerator;

import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-16
 */
@AutoValue
public abstract class Pipeline {
    abstract String descriptor();
    abstract Language language();
    abstract Map<String, String> configuration();

    public static TypeAdapter<Pipeline> typeAdapter(Gson gson) {
        return new AutoValue_Pipeline.GsonTypeAdapter(gson);
    }

    public AnalysisEngineDescription assemble() throws ViewConfigurationException {
        final AnalysisEngineDescription description = descriptor().startsWith("fit:")
                ? assembleFitComponent(descriptor().substring(4))
                : new AnalysisEngineConfigurator(descriptor(), configuration()).configure();

        description.getMetaData().setName(descriptor());
        return description;
    }

    private AnalysisEngineDescription assembleFitComponent(final String fitPath) throws ViewConfigurationException {
        final String fullPath = "werti.uima.fit." + fitPath;
        try {
            final Class<?> generatorClass = Class.forName(fullPath);
            final Object instance = generatorClass.newInstance();
            if (instance instanceof DescriptionGenerator) {
                return ((DescriptionGenerator) instance).produce(configuration());
            }
            throw new ViewConfigurationException(fullPath + " is not a DescriptionGenerator.");
        } catch (ResourceInitializationException
                | InstantiationException
                | IllegalAccessException
                | ClassNotFoundException e) {
            throw new ViewConfigurationException(e);
        }
    }

    public static Pipeline create(
            String descriptor,
            Language language,
            Map<String, String> configuration
    ) {
        return builder()
                .descriptor(descriptor)
                .language(language)
                .configuration(configuration)
                .build();
    }

    public static Pipeline createFromFeatureSpec(
            final Language language,
            final FeatureData features
    ) throws NoPipelineForFeaturesException {
        final FeatureSpecParser parser = new FeatureSpecParser();
        final String descriptor = parser.match(language, features);
        return create(
                descriptor,
                language,
                ImmutableMap.of()
        );
    }

    public static Builder builder() {
        return new AutoValue_Pipeline.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder descriptor(String descriptor);

        public abstract Builder configuration(Map<String, String> configuration);

        public abstract Builder language(Language language);

        public abstract Pipeline build();
    }
}
