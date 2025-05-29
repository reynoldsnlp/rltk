package werti.uima.fit.dkpro;

import de.tudarmstadt.ukp.dkpro.core.opennlp.OpenNlpSegmenter;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.DescriptionGenerator;

import java.util.Map;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class OpenNlpSegmenterDescription implements DescriptionGenerator {
    @Override
    public AnalysisEngineDescription produce(Map<String, String> configuration) throws ResourceInitializationException {
        final String[] zoneTypes = { "werti.uima.types.annot.BlockText" };
        final AnalysisEngineDescription description = createEngineDescription(
                OpenNlpSegmenter.class,
                OpenNlpSegmenter.PARAM_STRICT_ZONING, true,
                OpenNlpSegmenter.PARAM_ZONE_TYPES, zoneTypes
        );

        configure(description, configuration);
        return description;
    }
}
