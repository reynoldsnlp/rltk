package werti.uima;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.ConfigurationParameterFactory;
import org.apache.uima.resource.ResourceInitializationException;

import java.util.Map;

/**
 * An analysis engine that can be produced at runtime from a description and a
 * configuration using UIMAfit.
 *
 * Implementing classes must implement {@link #produce(Map)}. Sensible defaults are provided for
 * {@link #produce()}, and {@link #configure(AnalysisEngineDescription, Map)}.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public interface DescriptionGenerator {
    /**
     * Produce an analysis engine without configuration.
     * The default implementation is provided as a convenience method to call
     * {@link #produce(Map)} with an empty configuration.
     *
     * @return The <tt>AnalysisEngineDescription</tt> for this class.
     *
     * @throws ResourceInitializationException When AE initialisation fails.
     */
    default AnalysisEngineDescription produce()
            throws ResourceInitializationException{
        return produce(ImmutableMap.of());
    }

    /**
     * Configures a given engine given a map of configuration values.
     * Convenience method provided for simple <tt>String</tt> → <tt>String</tt> configurations.
     *
     * <b>Postcondition:</b> The given description is destructively configured.
     *
     * @param description The AE description to configure
     * @param configuration The configuration parameters to apply to the provided AE.
     */
    default void configure(
            final AnalysisEngineDescription description,
            final Map<String, String> configuration
    ) {
        configuration.forEach(
                (key, value) -> ConfigurationParameterFactory.addConfigurationParameter(
                        description,
                        key,
                        value
                )
        );
    }

    /**
     * Produce the <tt>AnalysisEngineDescription</tt> for this class given the
     * provided configuration.
     *
     * @param configuration A map of configuration values
     *
     * @return The <tt>AnalysisEngineDescription</tt> for this engine
     *
     * @throws ResourceInitializationException When AE initialisation fails.
     */
    AnalysisEngineDescription produce(
            Map<String, String> configuration
    ) throws ResourceInitializationException;
}
