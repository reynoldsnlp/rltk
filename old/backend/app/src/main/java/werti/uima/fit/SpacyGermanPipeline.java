package werti.uima.fit;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.DescriptionGenerator;
import werti.uima.ae.OpenNlpSentenceDetector;
import werti.uima.ae.SpacyRestAnnotator;
import werti.uima.enhancer.SpacyEnhancer;

import java.util.Map;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class SpacyGermanPipeline implements DescriptionGenerator {
    @Override
    public AnalysisEngineDescription produce(Map<String, String> configuration) throws ResourceInitializationException {
        return createEngineDescription(
                createEngineDescription(SpacyRestAnnotator.class),
                createEngineDescription(OpenNlpSentenceDetector.class),
                createEngineDescription(SpacyEnhancer.class)
        );
    }
}
