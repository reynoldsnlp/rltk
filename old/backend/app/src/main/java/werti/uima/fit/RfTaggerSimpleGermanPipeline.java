package werti.uima.fit;

import de.tudarmstadt.ukp.dkpro.core.rftagger.RfTagger;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.DescriptionGenerator;
import werti.uima.enhancer.DkProEnhancer;
import werti.uima.fit.dkpro.OpenNlpSegmenterDescription;

import java.util.Map;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class RfTaggerSimpleGermanPipeline implements DescriptionGenerator {
    @Override
    public AnalysisEngineDescription produce(Map<String, String> configuration)
            throws ResourceInitializationException {

        final AnalysisEngineDescription enhancer = createEngineDescription(DkProEnhancer.class);
        configure(enhancer, configuration);

        return createEngineDescription(
                new OpenNlpSegmenterDescription().produce(),
                createEngineDescription(RfTagger.class),
                enhancer
        );
    }
}
