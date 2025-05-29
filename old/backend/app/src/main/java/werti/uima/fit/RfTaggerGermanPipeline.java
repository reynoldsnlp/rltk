package werti.uima.fit;

import de.tudarmstadt.ukp.dkpro.core.rftagger.RfTagger;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.DescriptionGenerator;
import werti.uima.enhancer.DkProEnhancer;
import werti.uima.fit.dkpro.MateLemmatizerDescription;
import werti.uima.fit.dkpro.OpenNlpSegmenterDescription;

import java.util.Map;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class RfTaggerGermanPipeline implements DescriptionGenerator {
    @Override
    public AnalysisEngineDescription produce(Map<String, String> configuration) throws ResourceInitializationException {
        final AnalysisEngineDescription enhancer = createEngineDescription(DkProEnhancer.class);
        configure(enhancer, configuration);

        return createEngineDescription(
                new OpenNlpSegmenterDescription().produce(),
                new MateLemmatizerDescription().produce(),
                createEngineDescription(RfTagger.class),
                enhancer
        );
    }
}
