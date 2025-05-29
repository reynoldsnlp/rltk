package werti.server.data;

import com.google.common.collect.ImmutableMap;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Test;
import werti.Language;

import static org.junit.Assert.assertEquals;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class PipelineTest {
    @Test
    public void assemblesComponentsFromDescriptors() throws Exception {
        final Pipeline pipeline = Pipeline.create(
                "desc/annotators/OpenNlpTokenizer",
                Language.ENGLISH,
                ImmutableMap.of()
        );

        final AnalysisEngineDescription description = pipeline.assemble();

        assertEquals(
                "Pipeline should be implemented by OpenNlpTokenizer",
                "werti.uima.ae.OpenNlpTokenizer",
                description.getAnnotatorImplementationName()
        );
    }

    @Test
    public void assemblesComponentsFromUimaFit() throws Exception {
        final Pipeline pipeline = Pipeline.create(
                "fit:dkpro.OpenNlpSegmenterDescription",
                Language.ENGLISH,
                ImmutableMap.of()
        );

        final AnalysisEngineDescription description = pipeline.assemble();

        assertEquals(
                "Pipeline should be implemented by DkPro OpenNlpSegmenter",
                "de.tudarmstadt.ukp.dkpro.core.opennlp.OpenNlpSegmenter",
                description.getAnnotatorImplementationName()
        );
    }
}
