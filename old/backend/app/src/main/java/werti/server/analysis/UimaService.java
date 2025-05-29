package werti.server.analysis;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import werti.server.data.ViewConfigurationException;
import werti.server.servlet.ViewRequest;
import werti.uima.ConvenientCas;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-21
 */
public interface UimaService {
    void runPipeline(ConvenientCas cas, AnalysisEngineDescription analysisEngineDescription)
            throws DocumentAnalysisException;

    default void runPipeline(ConvenientCas cas, ViewRequest viewRequest) throws
            DocumentAnalysisException {
        try {
            runPipeline(cas, viewRequest.pipeline().assemble());
        } catch (ViewConfigurationException e) {
            throw new DocumentAnalysisException(e);
        }
    }
}
